package mikuclub

import (
	"testing"

	"unisearch/plugin/testutil"
)

func TestMikuclubPluginContract(t *testing.T) {
	p := NewMikuclubPlugin()
	testutil.AssertPluginContract(t, p)
}
