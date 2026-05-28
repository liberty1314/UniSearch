package dyyj

import (
	"testing"

	"unisearch/plugin/testutil"
)

func TestDyyjPluginContract(t *testing.T) {
	p := NewDyyjPlugin()
	testutil.AssertPluginContract(t, p)
}
