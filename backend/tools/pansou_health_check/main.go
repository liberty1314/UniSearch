package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util"

	_ "unisearch/plugin/duoduo"
	_ "unisearch/plugin/hdr4k"
	_ "unisearch/plugin/huban"
	_ "unisearch/plugin/jikepan"
	_ "unisearch/plugin/pan666"
	_ "unisearch/plugin/panwiki"
	_ "unisearch/plugin/panyq"
	_ "unisearch/plugin/qupansou"
	_ "unisearch/plugin/zhizhen"
)

const (
	defaultKeywords = "仙逆,庆余年,4K,短剧,纪录片"
	defaultPlugins  = "zhizhen,duoduo,huban,jikepan,qupansou,panwiki,pan666,hdr4k,panyq"
	defaultChannels = "tgsearchers6,sbsbsnsqq,kkxlzy,alyp_1,dianyingshare,WFYSFX02,cctv1211,liangxingzhinan,ammmziyuan,cili8888,jzmm_123pan,Q_dianying,domgmingapk,dianying4k,q_dianshiju,tgbokee,ucshare,godupan,gokuapan,gimy115,WFYSFX03,peccxin,Movie888035,xlwpzy,zyywpzy,wydwpzy,gimy100,gimy115iso"
)

type pluginKeywordResult struct {
	Keyword     string
	ResultCount int
	LinkCount   int
	Duration    time.Duration
	Error       string
	TimedOut    bool
}

type pluginHealthResult struct {
	Name       string
	Results    []pluginKeywordResult
	Conclusion string
}

type channelHealthResult struct {
	Name        string
	Status      string
	ResultCount int
	LinkCount   int
	Duration    time.Duration
	Error       string
}

func main() {
	keywordsFlag := flag.String("keywords", defaultKeywords, "用逗号分隔的验证关键词")
	pluginsFlag := flag.String("plugins", defaultPlugins, "用逗号分隔的插件名称")
	channelsFlag := flag.String("channels", defaultChannels, "用逗号分隔的频道名称")
	pluginTimeout := flag.Duration("plugin-timeout", 25*time.Second, "单个插件关键词验证超时时间")
	channelTimeout := flag.Duration("channel-timeout", 10*time.Second, "单个频道验证超时时间")
	outPath := flag.String("out", "../.Codex/pansou-health-matrix.md", "健康矩阵 Markdown 输出路径")
	flag.Parse()

	keywords := splitList(*keywordsFlag)
	pluginNames := splitList(*pluginsFlag)
	channelNames := splitList(*channelsFlag)

	pluginResults := checkPlugins(pluginNames, keywords, *pluginTimeout)
	channelResults := checkChannels(channelNames, keywords, *channelTimeout)

	report := renderReport(pluginResults, channelResults, keywords)
	if err := os.WriteFile(*outPath, []byte(report), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "写入健康矩阵失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("健康矩阵已生成：%s\n", *outPath)
}

func splitList(value string) []string {
	parts := strings.Split(value, ",")
	results := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		key := strings.ToLower(part)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		results = append(results, part)
	}
	return results
}

func checkPlugins(pluginNames []string, keywords []string, timeout time.Duration) []pluginHealthResult {
	results := make([]pluginHealthResult, 0, len(pluginNames))
	for _, name := range pluginNames {
		p, ok := plugin.GetPluginByName(name)
		item := pluginHealthResult{Name: name}
		if !ok {
			item.Results = append(item.Results, pluginKeywordResult{Keyword: "-", Error: "插件未注册"})
			item.Conclusion = "暂缓迁入"
			results = append(results, item)
			continue
		}

		for _, keyword := range keywords {
			item.Results = append(item.Results, runPluginKeyword(p, keyword, timeout))
		}
		item.Conclusion = classifyPlugin(item.Results)
		results = append(results, item)
	}
	return results
}

func runPluginKeyword(p plugin.AsyncSearchPlugin, keyword string, timeout time.Duration) pluginKeywordResult {
	startedAt := time.Now()
	done := make(chan struct {
		results []model.SearchResult
		err     error
	}, 1)

	go func() {
		results, err := p.Search(keyword, nil)
		done <- struct {
			results []model.SearchResult
			err     error
		}{results: results, err: err}
	}()

	select {
	case output := <-done:
		result := pluginKeywordResult{
			Keyword:     keyword,
			ResultCount: len(output.results),
			LinkCount:   countLinks(output.results),
			Duration:    time.Since(startedAt),
		}
		if output.err != nil {
			result.Error = output.err.Error()
		}
		return result
	case <-time.After(timeout):
		return pluginKeywordResult{
			Keyword:  keyword,
			Duration: time.Since(startedAt),
			Error:    fmt.Sprintf("超过 %s 未返回", timeout),
			TimedOut: true,
		}
	}
}

func countLinks(results []model.SearchResult) int {
	total := 0
	for _, result := range results {
		total += len(result.Links)
	}
	return total
}

func classifyPlugin(results []pluginKeywordResult) string {
	successWithLinks := 0
	successWithoutLinks := 0
	failures := 0
	for _, result := range results {
		if result.Error != "" || result.TimedOut {
			failures++
			continue
		}
		if result.LinkCount > 0 {
			successWithLinks++
		} else {
			successWithoutLinks++
		}
	}

	switch {
	case successWithLinks >= 2 && failures == 0:
		return "可默认启用"
	case successWithLinks > 0:
		return "可安装不默认启用"
	case successWithoutLinks > 0:
		return "暂缓迁入"
	default:
		return "保留关闭"
	}
}

func checkChannels(channelNames []string, keywords []string, timeout time.Duration) []channelHealthResult {
	client := &http.Client{
		Timeout: timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	results := make([]channelHealthResult, len(channelNames))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 8)
	for index, name := range channelNames {
		index, name := index, name
		wg.Add(1)
		sem <- struct{}{}
		go func() {
			defer wg.Done()
			defer func() { <-sem }()
			results[index] = checkChannel(client, name, keywords, timeout)
		}()
	}
	wg.Wait()
	return results
}

func checkChannel(client *http.Client, name string, keywords []string, timeout time.Duration) channelHealthResult {
	startedAt := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	keyword := ""
	if len(keywords) > 0 {
		keyword = keywords[0]
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, util.BuildSearchURL(name, keyword, ""), nil)
	if err != nil {
		return channelHealthResult{Name: name, Status: "error", Duration: time.Since(startedAt), Error: err.Error()}
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return channelHealthResult{Name: name, Status: "error", Duration: time.Since(startedAt), Error: err.Error()}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return channelHealthResult{Name: name, Status: "error", Duration: time.Since(startedAt), Error: fmt.Sprintf("频道返回状态码: %d", resp.StatusCode)}
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return channelHealthResult{Name: name, Status: "error", Duration: time.Since(startedAt), Error: err.Error()}
	}

	parsed, _, err := util.ParseSearchResults(string(body), name)
	if err != nil {
		return channelHealthResult{Name: name, Status: "error", Duration: time.Since(startedAt), Error: err.Error()}
	}

	status := "healthy"
	if len(parsed) == 0 {
		status = "untested"
	}
	return channelHealthResult{
		Name:        name,
		Status:      status,
		ResultCount: len(parsed),
		LinkCount:   countLinks(parsed),
		Duration:    time.Since(startedAt),
	}
}

func renderReport(pluginResults []pluginHealthResult, channelResults []channelHealthResult, keywords []string) string {
	var builder strings.Builder
	now := time.Now().Format("2006-01-02 15:04:05 MST")

	builder.WriteString("# pansou 插件与频道健康矩阵\n\n")
	builder.WriteString(fmt.Sprintf("生成时间：%s\n\n", now))
	builder.WriteString(fmt.Sprintf("验证关键词：`%s`\n\n", strings.Join(keywords, "`、`")))

	builder.WriteString("## 插件健康矩阵\n\n")
	builder.WriteString("| 插件 | 结论 | 成功关键词 | 结果数 | 有效链接数 | 错误摘要 |\n")
	builder.WriteString("|---|---|---:|---:|---:|---|\n")
	for _, result := range pluginResults {
		successKeywords, totalResults, totalLinks, errors := summarizePluginResult(result.Results)
		builder.WriteString(fmt.Sprintf("| `%s` | %s | %d | %d | %d | %s |\n",
			result.Name, result.Conclusion, successKeywords, totalResults, totalLinks, escapeTable(strings.Join(errors, "<br>"))))
	}

	builder.WriteString("\n## 频道健康矩阵\n\n")
	builder.WriteString("| 频道 | 状态 | 结果数 | 有效链接数 | 耗时 | 错误摘要 |\n")
	builder.WriteString("|---|---|---:|---:|---:|---|\n")
	for _, result := range channelResults {
		builder.WriteString(fmt.Sprintf("| `%s` | %s | %d | %d | %s | %s |\n",
			result.Name, result.Status, result.ResultCount, result.LinkCount, result.Duration.Round(time.Millisecond), escapeTable(result.Error)))
	}

	builder.WriteString("\n## 默认启用建议\n\n")
	defaultPlugins := make([]string, 0)
	optionalPlugins := make([]string, 0)
	for _, result := range pluginResults {
		switch result.Conclusion {
		case "可默认启用":
			defaultPlugins = append(defaultPlugins, result.Name)
		case "可安装不默认启用":
			optionalPlugins = append(optionalPlugins, result.Name)
		}
	}
	sort.Strings(defaultPlugins)
	sort.Strings(optionalPlugins)
	builder.WriteString(fmt.Sprintf("- 可默认启用插件：`%s`\n", strings.Join(defaultPlugins, "`,`")))
	builder.WriteString(fmt.Sprintf("- 可安装不默认启用插件：`%s`\n", strings.Join(optionalPlugins, "`,`")))

	healthyChannels := make([]string, 0)
	for _, result := range channelResults {
		if result.Status == "healthy" {
			healthyChannels = append(healthyChannels, result.Name)
		}
	}
	sort.Strings(healthyChannels)
	builder.WriteString(fmt.Sprintf("- 健康频道：`%s`\n", strings.Join(healthyChannels, "`,`")))

	return builder.String()
}

func summarizePluginResult(results []pluginKeywordResult) (int, int, int, []string) {
	successKeywords := 0
	totalResults := 0
	totalLinks := 0
	errors := make([]string, 0)
	for _, result := range results {
		totalResults += result.ResultCount
		totalLinks += result.LinkCount
		if result.Error == "" && !result.TimedOut {
			successKeywords++
			continue
		}
		errors = append(errors, fmt.Sprintf("%s: %s", result.Keyword, result.Error))
	}
	if len(errors) == 0 {
		errors = append(errors, "无")
	}
	return successKeywords, totalResults, totalLinks, errors
}

func escapeTable(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "无"
	}
	return strings.ReplaceAll(value, "|", "\\|")
}
