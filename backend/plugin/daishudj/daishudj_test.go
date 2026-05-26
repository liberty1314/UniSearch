package daishudj

import (
	"testing"

	"unisearch/plugin/testutil"
)

func TestDaishuPluginContract(t *testing.T) {
	p := NewDaishuPlugin()
	testutil.AssertPluginContract(t, p)
}
