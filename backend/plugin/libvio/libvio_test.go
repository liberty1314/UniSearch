package libvio

import (
	"testing"

	"unisearch/plugin/testutil"
)

func TestLibvioPluginContract(t *testing.T) {
	p := NewLibvioPlugin()
	testutil.AssertPluginContract(t, p)
}
