package alupan

import (
	"testing"

	"unisearch/plugin/testutil"
)

func TestAlupanPluginContract(t *testing.T) {
	p := NewAlupanPlugin()
	testutil.AssertPluginContract(t, p)
}
