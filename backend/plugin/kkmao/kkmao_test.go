package kkmao

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
	"unisearch/plugin/testutil"
)

func TestKkMaoPluginContract(t *testing.T) {
	p := NewKkMaoPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestExtractQuarkLinks(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<div class="article-content">
			<a href="https://pan.quark.cn/s/abc123" title="提取码: q1w2">资源 1</a>
			<a href="https://pan.quark.cn/s/abc123">重复资源</a>
			<a href="https://pan.quark.cn/s/xyz789">资源 2</a>
		</div>
	`))
	if err != nil {
		t.Fatalf("failed to parse fixture: %v", err)
	}

	links := extractQuarkLinks(doc)
	if len(links) != 2 {
		t.Fatalf("expected 2 unique links, got %d", len(links))
	}
	if links[0].Password != "q1w2" {
		t.Fatalf("expected password to be extracted, got %q", links[0].Password)
	}
}

func TestExtractQuarkLinksReturnsEmptyWhenNoMatches(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<div class="article-content">
			<a href="https://example.com/nope">not a quark link</a>
		</div>
	`))
	if err != nil {
		t.Fatalf("failed to parse fixture: %v", err)
	}

	links := extractQuarkLinks(doc)
	if len(links) != 0 {
		t.Fatalf("expected no links, got %d", len(links))
	}
}
