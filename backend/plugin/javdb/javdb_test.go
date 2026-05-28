package javdb

import (
	"testing"

	"unisearch/plugin/testutil"
)

func TestJavdbPluginContract(t *testing.T) {
	p := NewJavdbPlugin()
	testutil.AssertPluginContract(t, p)
}
