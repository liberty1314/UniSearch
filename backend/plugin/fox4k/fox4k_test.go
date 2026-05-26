package fox4k

import (
	"testing"

	"unisearch/plugin/testutil"
)

func TestFox4kPluginContract(t *testing.T) {
	p := NewFox4kPlugin()
	testutil.AssertPluginContract(t, p)
}
