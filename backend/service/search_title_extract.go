package service

import (
	"strings"

	"unisearch/model"
)

// 本文件负责从资源内容中抽取「链接-标题」配对，以及标题清洗等文本处理。
// 依赖 search_response_builder.go 中定义的包级正则变量（同 package service）。

func extractLinkTitlePairs(content string) map[string]string {
	if strings.Contains(content, "\n") {
		return extractLinkTitlePairsWithNewlines(content)
	}
	return extractLinkTitlePairsWithoutNewlines(content)
}

func extractLinkTitlePairsWithNewlines(content string) map[string]string {
	linkTitleMap := make(map[string]string)
	lines := strings.Split(content, "\n")

	var lastTitle string
	var lastTitleIndex int

	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}

		links := linkTitleLineRegex.FindAllString(line, -1)
		if len(links) > 0 {
			isStandardLinkLine := isLinkLine(line)
			if isStandardLinkLine && lastTitle != "" {
				for _, link := range links {
					linkTitleMap[link] = lastTitle
				}
			} else if !isStandardLinkLine {
				titleFromLine := extractTitleFromLinkLine(line)
				if titleFromLine != "" {
					for _, link := range links {
						linkTitleMap[link] = titleFromLine
					}
				} else if lastTitle != "" {
					for _, link := range links {
						linkTitleMap[link] = lastTitle
					}
				}
			}
			continue
		}

		if i+1 < len(lines) {
			nextLine := strings.TrimSpace(lines[i+1])
			if isLinkLine(nextLine) || linkTitleLineRegex.MatchString(nextLine) {
				lastTitle = cleanTitle(line)
				lastTitleIndex = i
			}
			continue
		}

		lastTitle = cleanTitle(line)
		lastTitleIndex = i
	}

	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}

		links := linkTitleLineRegex.FindAllString(line, -1)
		if len(links) == 0 {
			continue
		}

		for _, link := range links {
			if _, exists := linkTitleMap[link]; exists {
				continue
			}

			nearestTitle := ""
			for j := i - 1; j >= 0; j-- {
				if j == lastTitleIndex || (j+1 < len(lines) &&
					linkTitleLineRegex.MatchString(lines[j+1]) &&
					!linkTitleLineRegex.MatchString(lines[j])) {
					candidateTitle := cleanTitle(lines[j])
					if candidateTitle != "" {
						nearestTitle = candidateTitle
						break
					}
				}
			}

			if nearestTitle != "" {
				linkTitleMap[link] = nearestTitle
			}
		}
	}

	return linkTitleMap
}

func extractLinkTitlePairsWithoutNewlines(content string) map[string]string {
	linkTitleMap := make(map[string]string)

	links := quarkContentLinkRegex.FindAllString(content, -1)
	if len(links) == 0 {
		return linkTitleMap
	}

	segments := make([]string, len(links)+1)
	lastPos := 0

	for i, link := range links {
		pos := strings.Index(content[lastPos:], link) + lastPos
		if pos > lastPos {
			segments[i] = content[lastPos:pos]
		}
		lastPos = pos + len(link)
	}

	if lastPos < len(content) {
		segments[len(links)] = content[lastPos:]
	}

	for i, link := range links {
		title := extractTitleBeforeLink(segments[i])
		if title != "" {
			linkTitleMap[link] = title
		}
	}

	return linkTitleMap
}

func extractTitleBeforeLink(text string) string {
	text = strings.TrimSpace(text)
	if idx := strings.Index(text, "链接："); idx > 0 {
		return cleanTitle(text[:idx])
	}

	matches := titleSuffixRegex.FindStringSubmatch(text)
	if len(matches) > 1 {
		return cleanTitle(matches[1])
	}

	return cleanTitle(text)
}

func isLinkLine(line string) bool {
	lowerLine := strings.ToLower(line)
	return strings.HasPrefix(lowerLine, "链接：") ||
		strings.HasPrefix(lowerLine, "地址：") ||
		strings.HasPrefix(lowerLine, "资源地址：") ||
		strings.HasPrefix(lowerLine, "网盘：") ||
		strings.HasPrefix(lowerLine, "网盘地址：") ||
		strings.HasPrefix(lowerLine, "链接:")
}

func extractTitleFromLinkLine(line string) string {
	parts := strings.SplitN(line, "：", 2)
	if len(parts) == 2 && !strings.Contains(parts[0], "http") && !isLinkPrefix(parts[0]) {
		return cleanTitle(parts[0])
	}

	parts = strings.SplitN(line, ":", 2)
	if len(parts) == 2 && !strings.Contains(parts[0], "http") && !isLinkPrefix(parts[0]) {
		return cleanTitle(parts[0])
	}

	return ""
}

func isLinkPrefix(text string) bool {
	text = strings.ToLower(strings.TrimSpace(text))
	return text == "链接" ||
		text == "地址" ||
		text == "资源地址" ||
		text == "网盘" ||
		text == "网盘地址"
}

func cleanTitle(title string) string {
	title = strings.TrimSpace(title)
	title = strings.TrimPrefix(title, "名称：")
	title = strings.TrimPrefix(title, "标题：")
	title = strings.TrimPrefix(title, "片名：")
	title = strings.TrimPrefix(title, "名称:")
	title = strings.TrimPrefix(title, "标题:")
	title = strings.TrimPrefix(title, "片名:")

	title = titleHTMLReplacer.Replace(title)
	title = htmlTagRegex.ReplaceAllString(title, "")
	title = emojiRegex.ReplaceAllString(title, "")
	title = spaceRegex.ReplaceAllString(title, " ")

	return strings.TrimSpace(title)
}

func resolveMergedLinkTitle(result model.SearchResult, linkURL string, linkTitleMap map[string]string) string {
	if specificTitle := resolveSpecificLinkTitle(linkURL, linkTitleMap); specificTitle != "" {
		return specificTitle
	}
	return result.Title
}

func resolveSpecificLinkTitle(linkURL string, linkTitleMap map[string]string) string {
	if specificTitle, found := linkTitleMap[linkURL]; found && specificTitle != "" {
		return specificTitle
	}
	for mappedLink, mappedTitle := range linkTitleMap {
		if strings.HasPrefix(mappedLink, linkURL) && mappedTitle != "" {
			return mappedTitle
		}
	}
	return ""
}

func backfillLinkTitlesFromInlineContent(linkTitleMap map[string]string, result model.SearchResult) {
	content := result.Content
	parts := strings.Split(content, "链接：")
	if len(parts) <= 1 || len(result.Links) > len(parts)-1 {
		return
	}

	titles := make([]string, 0, len(parts))
	titles = append(titles, cleanTitle(parts[0]))

	for i := 1; i < len(parts)-1; i++ {
		part := parts[i]
		linkEnd := strings.IndexAny(part, " 窃东迎千我恋将野")
		if linkEnd > 0 {
			titles = append(titles, cleanTitle(part[linkEnd:]))
		}
	}

	for i, link := range result.Links {
		if i < len(titles) {
			linkTitleMap[link.URL] = titles[i]
		}
	}
}
