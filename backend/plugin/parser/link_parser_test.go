package parser

import "testing"

func TestExtractLinksParsesSupportedCloudLinks(t *testing.T) {
	text := `
		百度链接：https://pan.baidu.com/s/1abcDEF 提取码：9x8y
		夸克：https://pan.quark.cn/s/QUARK123
		阿里：https://www.alipan.com/s/Ali123
		天翼：https://cloud.189.cn/t/TY1234
		迅雷：https://pan.xunlei.com/s/XL123?pwd=abcd
		115：https://115.com/s/sw1234?password=zz99
		123：https://www.123pan.com/s/Abc-De
		UC：https://drive.uc.cn/s/UC123?public=1
		移动云盘：https://caiyun.139.com/m/i?175Ck999
		磁力：magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567
	`

	links := ExtractLinks(text)

	if len(links) != 10 {
		t.Fatalf("期望解析 10 个链接，实际得到 %d 个: %#v", len(links), links)
	}

	assertLink(t, links[0], "baidu", "https://pan.baidu.com/s/1abcDEF?pwd=9x8y", "9x8y")
	assertLink(t, links[1], "quark", "https://pan.quark.cn/s/QUARK123", "")
	assertLink(t, links[2], "aliyun", "https://www.alipan.com/s/Ali123", "")
	assertLink(t, links[3], "tianyi", "https://cloud.189.cn/t/TY1234", "")
	assertLink(t, links[4], "xunlei", "https://pan.xunlei.com/s/XL123?pwd=abcd", "abcd")
	assertLink(t, links[5], "115", "https://115.com/s/sw1234?password=zz99", "zz99")
	assertLink(t, links[6], "123", "https://123pan.com/s/Abc-De", "")
	assertLink(t, links[7], "uc", "https://drive.uc.cn/s/UC123?public=1", "")
	assertLink(t, links[8], "mobile", "https://caiyun.139.com/m/i?175Ck999", "")
	assertLink(t, links[9], "magnet", "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567", "")
}

func TestExtractLinksDeduplicatesByNormalizedURL(t *testing.T) {
	text := `
		https://pan.baidu.com/s/1abcDEF 提取码：9x8y
		https://pan.baidu.com/s/1abcDEF?pwd=9x8y
	`

	links := ExtractLinks(text)

	if len(links) != 1 {
		t.Fatalf("期望重复链接只保留 1 个，实际得到 %d 个: %#v", len(links), links)
	}
	assertLink(t, links[0], "baidu", "https://pan.baidu.com/s/1abcDEF?pwd=9x8y", "9x8y")
}

func TestExtractLinksReturnsEmptyForBlankInput(t *testing.T) {
	if links := ExtractLinks("   \n\t"); len(links) != 0 {
		t.Fatalf("空输入不应解析出链接，实际得到 %#v", links)
	}
}

func assertLink(t *testing.T, link Link, wantType, wantURL, wantPassword string) {
	t.Helper()
	if link.Type != wantType {
		t.Fatalf("链接类型不匹配，期望 %q，实际 %q，链接: %#v", wantType, link.Type, link)
	}
	if link.URL != wantURL {
		t.Fatalf("链接 URL 不匹配，期望 %q，实际 %q，链接: %#v", wantURL, link.URL, link)
	}
	if link.Password != wantPassword {
		t.Fatalf("提取码不匹配，期望 %q，实际 %q，链接: %#v", wantPassword, link.Password, link)
	}
}
