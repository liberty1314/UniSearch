package panta

import (
	"testing"

	"unisearch/plugin/testutil"
)

func TestPantaAsyncPluginContract(t *testing.T) {
	p := NewPantaAsyncPlugin()
	testutil.AssertPluginContract(t, p)
}
