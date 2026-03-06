package xuexizhinan

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

func TestExtractSearchItemsMatchesAllKeywords(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<div class="url-card">
			<a class="list-title" href="https://xuexizhinan.com/book/1.html">仙逆 完整版</a>
		</div>
		<div class="url-card">
			<a class="list-title" href="https://xuexizhinan.com/book/2.html">仙逆 番外</a>
		</div>
	`))
	if err != nil {
		t.Fatalf("failed to parse fixture: %v", err)
	}

	items := extractSearchItems(doc, "仙逆 完整版")
	if len(items) != 1 {
		t.Fatalf("expected 1 matching result, got %d", len(items))
	}
	if items[0].url != "https://xuexizhinan.com/book/1.html" {
		t.Fatalf("unexpected result URL: %s", items[0].url)
	}
}

func TestExtractSearchItemsReturnsEmptyWhenNothingMatches(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<div class="url-card">
			<a class="list-title" href="https://xuexizhinan.com/book/1.html">三体</a>
		</div>
	`))
	if err != nil {
		t.Fatalf("failed to parse fixture: %v", err)
	}

	items := extractSearchItems(doc, "仙逆")
	if len(items) != 0 {
		t.Fatalf("expected no matching results, got %d", len(items))
	}
}
