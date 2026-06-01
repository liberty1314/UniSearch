package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"unisearch/config"
	"unisearch/plugin"
	"unisearch/service"

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

type smokeScenario struct {
	Name       string
	SourceType string
	Channels   []string
	Plugins    []string
}

type smokeResult struct {
	Scenario  string
	Keyword   string
	Total     int
	Resources int
	Warnings  int
	Duration  time.Duration
	Error     string
}

func main() {
	outPath := flag.String("out", "../.Codex/pansou-search-smoke.md", "搜索链路冒烟 Markdown 输出路径")
	keywordsFlag := flag.String("keywords", "仙逆,庆余年,4K", "用逗号分隔的冒烟关键词")
	flag.Parse()

	config.Init()
	config.AppConfig.PluginTimeout = 12 * time.Second
	config.AppConfig.DefaultConcurrency = 8
	config.AppConfig.AsyncMaxBackgroundWorkers = 8

	pluginManager := plugin.NewPluginManager()
	pluginManager.RegisterAllGlobalPlugins()
	searchService := service.NewSearchService(pluginManager, nil, nil)

	keywords := splitList(*keywordsFlag)
	newChannels := []string{
		"tgsearchers6", "sbsbsnsqq", "kkxlzy", "alyp_1", "dianyingshare", "WFYSFX02", "cctv1211",
		"liangxingzhinan", "ammmziyuan", "cili8888", "jzmm_123pan", "Q_dianying", "domgmingapk",
		"dianying4k", "q_dianshiju", "tgbokee", "ucshare", "godupan", "gokuapan", "gimy115",
		"WFYSFX03", "peccxin", "Movie888035", "xlwpzy", "zyywpzy", "wydwpzy", "gimy100", "gimy115iso",
	}
	newPlugins := []string{"zhizhen", "duoduo", "huban", "jikepan", "qupansou", "panwiki", "pan666", "hdr4k", "panyq"}
	scenarios := []smokeScenario{
		{Name: "src=plugin", SourceType: "plugin", Plugins: newPlugins},
		{Name: "src=tg", SourceType: "tg", Channels: newChannels},
		{Name: "src=all", SourceType: "all", Channels: newChannels, Plugins: newPlugins},
	}

	results := make([]smokeResult, 0, len(scenarios)*len(keywords))
	for _, scenario := range scenarios {
		for _, keyword := range keywords {
			results = append(results, runScenario(searchService, scenario, keyword))
		}
	}

	report := renderReport(results)
	if err := os.WriteFile(*outPath, []byte(report), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "写入搜索链路冒烟报告失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("搜索链路冒烟报告已生成：%s\n", *outPath)
}

func splitList(value string) []string {
	parts := strings.Split(value, ",")
	results := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			results = append(results, part)
		}
	}
	return results
}

func runScenario(searchService *service.SearchService, scenario smokeScenario, keyword string) smokeResult {
	startedAt := time.Now()
	response, err := searchService.Search(
		keyword,
		scenario.Channels,
		8,
		true,
		"merged_by_type",
		scenario.SourceType,
		scenario.Plugins,
		nil,
		map[string]interface{}{},
	)

	result := smokeResult{
		Scenario: scenario.Name,
		Keyword:  keyword,
		Duration: time.Since(startedAt),
	}
	if err != nil {
		result.Error = err.Error()
		return result
	}

	result.Total = response.Total
	result.Resources = len(response.Resources)
	result.Warnings = len(response.Warnings)
	return result
}

func renderReport(results []smokeResult) string {
	var builder strings.Builder
	builder.WriteString("# pansou 搜索链路冒烟报告\n\n")
	builder.WriteString(fmt.Sprintf("生成时间：%s\n\n", time.Now().Format("2006-01-02 15:04:05 MST")))
	builder.WriteString("| 场景 | 关键词 | total | resources | warnings | 耗时 | 错误 |\n")
	builder.WriteString("|---|---|---:|---:|---:|---:|---|\n")
	for _, result := range results {
		builder.WriteString(fmt.Sprintf(
			"| `%s` | `%s` | %d | %d | %d | %s | %s |\n",
			result.Scenario,
			result.Keyword,
			result.Total,
			result.Resources,
			result.Warnings,
			result.Duration.Round(time.Millisecond),
			escapeTable(result.Error),
		))
	}

	builder.WriteString("\n## 结论\n\n")
	builder.WriteString("- `src=plugin` 验证本轮新增 9 个插件的搜索链路；外部站点异常会以 warnings 形式返回。\n")
	builder.WriteString("- `src=tg` 验证本轮新增 28 个频道的搜索链路；资源数量取决于 Telegram 当前搜索结果。\n")
	builder.WriteString("- `src=all` 验证新增插件与新增频道全量启用后的聚合链路，warnings 不应阻塞可用结果展示。\n")
	return builder.String()
}

func escapeTable(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "无"
	}
	return strings.ReplaceAll(value, "|", "\\|")
}
