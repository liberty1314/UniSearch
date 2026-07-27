package dyyj

import (
	"bytes"
	"io"
	"log"
	"net/http"
	"strings"
	"testing"

	"unisearch/plugin/testutil"
)

type dyyjRoundTripFunc func(*http.Request) (*http.Response, error)

func (f dyyjRoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func captureStandardLog(t *testing.T, run func()) string {
	t.Helper()
	var output bytes.Buffer
	previous := log.Writer()
	log.SetOutput(&output)
	t.Cleanup(func() { log.SetOutput(previous) })
	run()
	return output.String()
}

func TestDyyjPluginContract(t *testing.T) {
	p := NewDyyjPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestDyyjSensitiveLogsDoNotExposeURLsPasswordsOrHTML(t *testing.T) {
	t.Chdir(t.TempDir())
	p := NewDyyjPlugin()
	p.debugMode = true
	privateHTML := `<html><head><title>私密正文</title></head><body><noscript id="flarum-content"><ul><li><a href="/d/private-file">私密正文</a></li></ul></noscript><div class="Post-body"><p><strong>百度网盘</strong><a href="https://pan.example/s/private-file?pwd=1234">下载</a></p></div></body></html>`
	client := &http.Client{Transport: dyyjRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       io.NopCloser(strings.NewReader(privateHTML)),
			Request:    req,
		}, nil
	})}

	output := captureStandardLog(t, func() {
		_, _ = p.executeSearch(client, "隐私搜索词")
		_ = p.parseNetworkDiskLinks(privateHTML)
	})

	for _, forbidden := range []string{"隐私搜索词", "https://pan.example/s/private-file?pwd=1234", "1234", "<title>私密正文</title>"} {
		if strings.Contains(output, forbidden) {
			t.Fatalf("DYYJ 日志暴露敏感值 %q: %s", forbidden, output)
		}
	}
}
