package parser

import (
	"net/url"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"

	"unisearch/util"
)

// Link 表示插件从文本或 HTML 片段中解析出的标准化资源链接。
type Link struct {
	Type     string
	URL      string
	Password string
}

var supportedLinkPattern = regexp.MustCompile(`(?i)(?:magnet:\?xt=urn:btih:[a-zA-Z0-9]+|ed2k://\|file\|[^|]+\|\d+\|[A-Fa-f0-9]+\|/?|https?://[^\s'"<>()，。；]+)`)

// ExtractLinks 从文本中提取支持的网盘和磁力链接，并按标准化 URL 去重。
func ExtractLinks(text string) []Link {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}

	matches := supportedLinkPattern.FindAllString(text, -1)
	links := make([]Link, 0, len(matches))
	seen := make(map[string]struct{}, len(matches))

	for _, raw := range matches {
		raw = trimLinkBoundary(raw)
		linkType := util.GetLinkType(raw)
		if linkType == "others" {
			continue
		}

		password := extractPassword(text, raw, linkType)
		normalizedURL := normalizeURL(raw, password, linkType)
		if normalizedURL == "" {
			continue
		}

		dedupeKey := strings.ToLower(normalizedURL)
		if _, exists := seen[dedupeKey]; exists {
			continue
		}
		seen[dedupeKey] = struct{}{}

		links = append(links, Link{
			Type:     linkType,
			URL:      normalizedURL,
			Password: password,
		})
	}

	return links
}

// ExtractLinksFromSelection 从 HTML 节点中提取 href 与可见文本里的资源链接。
func ExtractLinksFromSelection(selection *goquery.Selection) []Link {
	if selection == nil || selection.Length() == 0 {
		return nil
	}

	links := make([]Link, 0)
	seen := make(map[string]struct{})

	selection.Find("a[href]").Each(func(_ int, node *goquery.Selection) {
		href, ok := node.Attr("href")
		if !ok || strings.TrimSpace(href) == "" {
			return
		}

		context := strings.Join(linkTextCandidates(node, href), " ")
		appendUniqueLinks(&links, seen, ExtractLinks(context))
	})

	appendUniqueLinks(&links, seen, ExtractLinks(selection.Text()))
	return links
}

func normalizeURL(raw string, password string, linkType string) string {
	switch linkType {
	case "baidu":
		cleaned := util.CleanBaiduPanURL(raw)
		if strings.Contains(cleaned, "?pwd=") || password == "" {
			return cleaned
		}
		if len(password) > 4 {
			password = password[:4]
		}
		return cleaned + "?pwd=" + password
	case "aliyun":
		return util.CleanAliyunPanURL(raw)
	case "tianyi":
		return util.CleanTianyiPanURL(raw)
	case "uc":
		return util.CleanUCPanURL(raw)
	case "123":
		return util.Clean123PanURL(raw)
	case "115":
		return util.Clean115PanURL(raw)
	default:
		return raw
	}
}

func extractPassword(text string, raw string, linkType string) string {
	switch linkType {
	case "baidu", "xunlei":
		if password := extractQueryValue(raw, "pwd"); password != "" {
			return password
		}
	case "115":
		if password := extractQueryValue(raw, "password"); password != "" {
			return password
		}
	}

	password := util.ExtractPassword(linkContext(text, raw), raw)
	if password == "" {
		return ""
	}
	if len(password) > 4 {
		return password[:4]
	}
	return password
}

func extractQueryValue(raw string, key string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	value := parsed.Query().Get(key)
	if value == "" {
		return ""
	}
	if len(value) > 4 {
		return value[:4]
	}
	return value
}

func trimLinkBoundary(raw string) string {
	return strings.Trim(raw, " \n\t\r\"'<>[]()（）")
}

func appendUniqueLinks(target *[]Link, seen map[string]struct{}, incoming []Link) {
	for _, link := range incoming {
		key := strings.ToLower(link.URL)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		*target = append(*target, link)
	}
}

func linkTextCandidates(node *goquery.Selection, href string) []string {
	candidates := []string{href, node.Text()}

	if title, ok := node.Attr("title"); ok {
		candidates = append(candidates, title)
	}
	if parent := node.Parent(); parent != nil && parent.Length() > 0 {
		candidates = append(candidates, parent.Text())
		if next := parent.Next(); next.Length() > 0 {
			candidates = append(candidates, next.Text())
		}
	}
	if sibling := node.Next(); sibling.Length() > 0 {
		candidates = append(candidates, sibling.Text())
	}

	normalized := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		candidate = strings.Join(strings.Fields(candidate), " ")
		if candidate != "" {
			normalized = append(normalized, candidate)
		}
	}

	return normalized
}

func linkContext(text string, raw string) string {
	index := strings.Index(text, raw)
	if index < 0 {
		return text
	}
	lineStart := strings.LastIndex(text[:index], "\n")
	if lineStart < 0 {
		lineStart = 0
	} else {
		lineStart++
	}

	lineEnd := strings.Index(text[index:], "\n")
	if lineEnd < 0 {
		lineEnd = len(text)
	} else {
		lineEnd = index + lineEnd
	}

	return text[lineStart:lineEnd]
}
