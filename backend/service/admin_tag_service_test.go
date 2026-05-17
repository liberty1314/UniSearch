package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"unisearch/config"
	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newAdminTagServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:admin_tag_test_%s?mode=memory&cache=private", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := db.AutoMigrate(&model.AdminTag{}, &model.TGChannel{}); err != nil {
		t.Fatalf("auto migrate admin tags: %v", err)
	}
	return db
}

func setupCustomPluginsTestFile(t *testing.T, plugins []config.CustomPlugin) string {
	t.Helper()

	path := filepath.Join(t.TempDir(), "custom_plugins.json")
	data, err := json.MarshalIndent(plugins, "", "  ")
	if err != nil {
		t.Fatalf("marshal custom plugins: %v", err)
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
		t.Fatalf("write custom plugins: %v", err)
	}

	previous := os.Getenv("CUSTOM_PLUGINS_PATH")
	if err := os.Setenv("CUSTOM_PLUGINS_PATH", path); err != nil {
		t.Fatalf("set custom plugins path: %v", err)
	}
	config.ResetCustomPluginsConfigForTest()
	t.Cleanup(func() {
		if previous == "" {
			_ = os.Unsetenv("CUSTOM_PLUGINS_PATH")
		} else {
			_ = os.Setenv("CUSTOM_PLUGINS_PATH", previous)
		}
		config.ResetCustomPluginsConfigForTest()
	})

	return path
}

func TestAdminTagServiceCreateTagSeparatesScopes(t *testing.T) {
	svc := NewAdminTagService(newAdminTagServiceTestDB(t))

	pluginTag, err := svc.CreateTag(model.AdminTagScopePlugin, "电影")
	if err != nil {
		t.Fatalf("create plugin tag: %v", err)
	}
	channelTag, err := svc.CreateTag(model.AdminTagScopeChannel, "电影")
	if err != nil {
		t.Fatalf("create channel tag: %v", err)
	}

	if pluginTag.Scope == channelTag.Scope {
		t.Fatalf("expected different scopes, got %+v and %+v", pluginTag, channelTag)
	}

	pluginTags, err := svc.ListTags(model.AdminTagScopePlugin)
	if err != nil {
		t.Fatalf("list plugin tags: %v", err)
	}
	channelTags, err := svc.ListTags(model.AdminTagScopeChannel)
	if err != nil {
		t.Fatalf("list channel tags: %v", err)
	}

	if len(pluginTags) != 1 || len(channelTags) != 1 {
		t.Fatalf("expected isolated tag dictionaries, got plugin=%d channel=%d", len(pluginTags), len(channelTags))
	}
}

func TestAdminTagServiceCreateTagDeduplicatesByScope(t *testing.T) {
	svc := NewAdminTagService(newAdminTagServiceTestDB(t))

	first, err := svc.CreateTag(model.AdminTagScopePlugin, "电影")
	if err != nil {
		t.Fatalf("create first tag: %v", err)
	}
	second, err := svc.CreateTag(model.AdminTagScopePlugin, "  电影  ")
	if err != nil {
		t.Fatalf("create duplicate tag: %v", err)
	}

	if first.ID != second.ID {
		t.Fatalf("expected duplicate creation to return same tag, got %+v and %+v", first, second)
	}
}

func TestAdminTagServiceEnsureTagsNormalizesInput(t *testing.T) {
	svc := NewAdminTagService(newAdminTagServiceTestDB(t))

	if err := svc.EnsureTags(model.AdminTagScopeChannel, []string{" 影视 ", "热门", "影视", ""}); err != nil {
		t.Fatalf("ensure tags: %v", err)
	}

	tags, err := svc.ListTags(model.AdminTagScopeChannel)
	if err != nil {
		t.Fatalf("list tags: %v", err)
	}
	if len(tags) != 2 {
		t.Fatalf("expected normalized unique tags, got %#v", tags)
	}
}

func TestAdminTagServiceUpdateTagSyncsChannels(t *testing.T) {
	db := newAdminTagServiceTestDB(t)
	svc := NewAdminTagService(db)

	tag, err := svc.CreateTag(model.AdminTagScopeChannel, "影视")
	if err != nil {
		t.Fatalf("create tag: %v", err)
	}

	channel := model.TGChannel{
		Name:      "movie-share",
		IsEnabled: true,
		Tags:      []string{"影视", "热门"},
	}
	if err := db.Create(&channel).Error; err != nil {
		t.Fatalf("create channel: %v", err)
	}

	updated, err := svc.UpdateTag(tag.ID, "电影")
	if err != nil {
		t.Fatalf("update tag: %v", err)
	}
	if updated.Name != "电影" {
		t.Fatalf("expected updated tag name, got %#v", updated)
	}

	var reloaded model.TGChannel
	if err := db.First(&reloaded, channel.ID).Error; err != nil {
		t.Fatalf("reload channel: %v", err)
	}
	if len(reloaded.Tags) != 2 || reloaded.Tags[0] != "电影" || reloaded.Tags[1] != "热门" {
		t.Fatalf("expected synced channel tags, got %#v", reloaded.Tags)
	}
}

func TestAdminTagServiceDeleteTagRemovesFromChannels(t *testing.T) {
	db := newAdminTagServiceTestDB(t)
	svc := NewAdminTagService(db)

	tag, err := svc.CreateTag(model.AdminTagScopeChannel, "影视")
	if err != nil {
		t.Fatalf("create tag: %v", err)
	}
	channel := model.TGChannel{
		Name:      "movie-share",
		IsEnabled: true,
		Tags:      []string{"影视", "热门"},
	}
	if err := db.Create(&channel).Error; err != nil {
		t.Fatalf("create channel: %v", err)
	}

	if err := svc.DeleteTag(tag.ID); err != nil {
		t.Fatalf("delete tag: %v", err)
	}

	var reloaded model.TGChannel
	if err := db.First(&reloaded, channel.ID).Error; err != nil {
		t.Fatalf("reload channel: %v", err)
	}
	if len(reloaded.Tags) != 1 || reloaded.Tags[0] != "热门" {
		t.Fatalf("expected tag removed from channel, got %#v", reloaded.Tags)
	}
}

func TestAdminTagServiceUpdateTagSyncsCustomPlugins(t *testing.T) {
	db := newAdminTagServiceTestDB(t)
	svc := NewAdminTagService(db)
	setupCustomPluginsTestFile(t, []config.CustomPlugin{
		{
			Name:    "custom-pan",
			URL:     "https://example.com",
			Enabled: true,
			Tags:    []string{"影视", "夸克"},
		},
	})

	tag, err := svc.CreateTag(model.AdminTagScopePlugin, "影视")
	if err != nil {
		t.Fatalf("create tag: %v", err)
	}

	updated, err := svc.UpdateTag(tag.ID, "电影")
	if err != nil {
		t.Fatalf("update tag: %v", err)
	}
	if updated.Name != "电影" {
		t.Fatalf("expected updated plugin tag, got %#v", updated)
	}

	plugins := config.GetCustomPluginsConfig().GetPlugins()
	if len(plugins) != 1 || len(plugins[0].Tags) != 2 || plugins[0].Tags[0] != "电影" {
		t.Fatalf("expected synced plugin tags, got %#v", plugins)
	}
}

func TestAdminTagServiceDeleteTagRemovesFromCustomPlugins(t *testing.T) {
	db := newAdminTagServiceTestDB(t)
	svc := NewAdminTagService(db)
	setupCustomPluginsTestFile(t, []config.CustomPlugin{
		{
			Name:    "custom-pan",
			URL:     "https://example.com",
			Enabled: true,
			Tags:    []string{"影视", "夸克"},
		},
	})

	tag, err := svc.CreateTag(model.AdminTagScopePlugin, "影视")
	if err != nil {
		t.Fatalf("create tag: %v", err)
	}

	if err := svc.DeleteTag(tag.ID); err != nil {
		t.Fatalf("delete tag: %v", err)
	}

	plugins := config.GetCustomPluginsConfig().GetPlugins()
	if len(plugins) != 1 || len(plugins[0].Tags) != 1 || plugins[0].Tags[0] != "夸克" {
		t.Fatalf("expected removed plugin tag, got %#v", plugins)
	}
}
