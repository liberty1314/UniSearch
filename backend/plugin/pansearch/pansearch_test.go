package pansearch

import (
	"testing"

	"unisearch/plugin/testutil"
)

func TestPanSearchPluginContract(t *testing.T) {
	p := NewPanSearchPlugin()
	testutil.AssertPluginContract(t, p)
}
