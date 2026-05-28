package quark4k

import (
	"testing"

	"unisearch/plugin/testutil"
)

func TestQuark4KAsyncPluginContract(t *testing.T) {
	p := NewQuark4KAsyncPlugin()
	testutil.AssertPluginContract(t, p)
}
