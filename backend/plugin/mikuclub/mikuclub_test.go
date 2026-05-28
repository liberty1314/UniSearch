package mikuclub

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"

	"unisearch/plugin/testutil"
)

func TestMikuclubPluginContract(t *testing.T) {
	p := NewMikuclubPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestExtractLinksUsesSharedParser(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<div>
			<a href="https://pan.baidu.com/s/1abcDEF">百度网盘</a>
			<span>提取码：9x8y</span>
			<p>UC：https://drive.uc.cn/s/UC123?public=1</p>
		</div>
	`))
	if err != nil {
		t.Fatalf("解析测试 HTML 失败: %v", err)
	}

	links := extractLinksFromSelection(doc.Find("div").First())

	if len(links) != 2 {
		t.Fatalf("期望解析 2 个链接，实际得到 %d 个: %#v", len(links), links)
	}
	if links[0].Type != "baidu" || links[0].URL != "https://pan.baidu.com/s/1abcDEF?pwd=9x8y" || links[0].Password != "9x8y" {
		t.Fatalf("百度链接解析不符合公共解析期望: %#v", links[0])
	}
	if links[1].Type != "uc" || links[1].URL != "https://drive.uc.cn/s/UC123?public=1" {
		t.Fatalf("UC 链接解析不符合公共解析期望: %#v", links[1])
	}
}
