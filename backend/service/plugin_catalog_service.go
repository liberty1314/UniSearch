package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
)

type customPluginStore interface {
	GetPlugins() []config.CustomPlugin
	AddPlugin(config.CustomPlugin) error
}

// PluginCatalogService 聚合本地插件和远程市场目录。
type PluginCatalogService struct {
	pluginManager       *plugin.PluginManager
	pluginHealthService *PluginHealthService
	pluginStateService  *PluginStateService
	customPlugins       customPluginStore
	defaultCatalogPath  string
	pluginRegistryURL   string
	remoteCatalogClient *http.Client
}

func NewPluginCatalogService(pluginManager *plugin.PluginManager, pluginHealthService *PluginHealthService, pluginStateService *PluginStateService) *PluginCatalogService {
	return &PluginCatalogService{
		pluginManager:       pluginManager,
		pluginHealthService: pluginHealthService,
		pluginStateService:  pluginStateService,
		customPlugins:       config.GetCustomPluginsConfig(),
		defaultCatalogPath:  resolveDefaultPluginCatalogPath(),
		pluginRegistryURL:   strings.TrimSpace(os.Getenv("PLUGIN_MARKET_REGISTRY_URL")),
		remoteCatalogClient: defaultPluginCatalogHTTPClient(),
	}
}

func defaultPluginCatalogHTTPClient() *http.Client {
	return &http.Client{Timeout: 4 * time.Second}
}

func resolveDefaultPluginCatalogPath() string {
	if path := strings.TrimSpace(os.Getenv("PLUGIN_MARKET_DEFAULT_CATALOG_PATH")); path != "" {
		return path
	}
	if _, err := os.Stat("plugin_market.default.json"); err == nil {
		return "plugin_market.default.json"
	}
	return "backend/plugin_market.default.json"
}

// ListCatalog 返回插件中心目录，source 支持 all/local/remote。
func (s *PluginCatalogService) ListCatalog(source string, _ bool) (model.PluginCatalogResponse, error) {
	if s == nil {
		return model.PluginCatalogResponse{}, errors.New("插件中心服务未初始化")
	}
	source = normalizeCatalogSource(source)

	localItems := s.buildLocalCatalogItems()
	localByID := make(map[string]model.PluginCatalogItem, len(localItems))
	localByName := make(map[string]model.PluginCatalogItem, len(localItems))
	for _, item := range localItems {
		localByID[strings.ToLower(item.ID)] = item
		localByName[strings.ToLower(item.Name)] = item
	}

	if source == "local" {
		return model.PluginCatalogResponse{
			Version: "local",
			Source:  "local",
			Items:   sortCatalogItems(localItems),
		}, nil
	}

	remoteCatalog, err := s.loadRemoteCatalog()
	if err != nil {
		return model.PluginCatalogResponse{}, err
	}
	remoteItems := make([]model.PluginCatalogItem, 0, len(remoteCatalog.Items))
	for _, remoteItem := range remoteCatalog.Items {
		normalized := normalizeRemoteCatalogItem(remoteItem)
		if local, ok := localByID[strings.ToLower(normalized.ID)]; ok {
			normalized = mergeLocalAndRemoteCatalogItem(local, normalized)
		} else if local, ok := localByName[strings.ToLower(normalized.Name)]; ok {
			normalized = mergeLocalAndRemoteCatalogItem(local, normalized)
		}
		remoteItems = append(remoteItems, normalized)
	}

	if source == "remote" {
		return model.PluginCatalogResponse{
			Version: remoteCatalog.Version,
			Source:  remoteCatalog.Source,
			Items:   sortCatalogItems(remoteItems),
		}, nil
	}

	merged := make([]model.PluginCatalogItem, 0, len(localItems)+len(remoteItems))
	seen := make(map[string]int, len(localItems)+len(remoteItems))
	for _, item := range localItems {
		seen[strings.ToLower(item.ID)] = len(merged)
		merged = append(merged, item)
	}
	for _, remoteItem := range remoteItems {
		key := strings.ToLower(remoteItem.ID)
		if idx, exists := seen[key]; exists {
			merged[idx] = mergeLocalAndRemoteCatalogItem(merged[idx], remoteItem)
			continue
		}
		seen[key] = len(merged)
		merged = append(merged, remoteItem)
	}

	return model.PluginCatalogResponse{
		Version: remoteCatalog.Version,
		Source:  remoteCatalog.Source,
		Items:   sortCatalogItems(merged),
	}, nil
}

func normalizeCatalogSource(source string) string {
	switch strings.ToLower(strings.TrimSpace(source)) {
	case "local", "remote":
		return strings.ToLower(strings.TrimSpace(source))
	default:
		return "all"
	}
}

func (s *PluginCatalogService) buildLocalCatalogItems() []model.PluginCatalogItem {
	plugins := []plugin.AsyncSearchPlugin{}
	if s.pluginManager != nil {
		plugins = s.pluginManager.GetPlugins()
	}
	customPlugins := []config.CustomPlugin{}
	if s.customPlugins != nil {
		customPlugins = s.customPlugins.GetPlugins()
	}

	names := make([]string, 0, len(plugins)+len(customPlugins))
	for _, p := range plugins {
		names = append(names, p.Name())
	}
	for _, cp := range customPlugins {
		names = append(names, cp.Name)
	}

	enabledMap := make(map[string]bool)
	if s.pluginStateService != nil {
		if statusMap, err := s.pluginStateService.GetStatusMap(names); err == nil {
			enabledMap = statusMap
		}
	}
	healthMap := make(map[string]model.PluginHealthSnapshot)
	if s.pluginHealthService != nil {
		if snapshots, err := s.pluginHealthService.GetSnapshotMap(names); err == nil {
			healthMap = snapshots
		}
	}

	items := make([]model.PluginCatalogItem, 0, len(plugins)+len(customPlugins))
	for _, p := range plugins {
		enabled := true
		if value, exists := enabledMap[p.Name()]; exists {
			enabled = value
		}
		manifest := plugin.ResolvePluginManifest(p)
		description := manifest.Description
		item := buildInstalledCatalogItem(p.Name(), "builtin", p.Priority(), "", description, manifest, enabled, healthMap[p.Name()])
		items = append(items, item)
	}

	for _, cp := range customPlugins {
		enabled := cp.Enabled
		if value, exists := enabledMap[cp.Name]; exists {
			enabled = value
		}
		manifest := buildCatalogCustomManifest(cp)
		item := buildInstalledCatalogItem(cp.Name, "custom", cp.Priority, cp.URL, cp.Description, manifest, enabled, healthMap[cp.Name])
		items = append(items, item)
	}

	return items
}

func buildInstalledCatalogItem(name string, pluginType string, priority int, url string, description string, manifest model.PluginManifest, enabled bool, health model.PluginHealthSnapshot) model.PluginCatalogItem {
	if strings.TrimSpace(description) == "" {
		description = manifest.Description
	}
	status := "inactive"
	if enabled {
		if pluginType == "custom" {
			status = "custom"
		} else {
			status = "active"
		}
	}
	var healthPtr *model.PluginHealthSnapshot
	if !health.LastCheckedAt.IsZero() || health.LastError != "" || health.CheckSource != "" {
		healthCopy := health
		healthPtr = &healthCopy
		if enabled && !health.IsHealthy {
			status = "error"
		}
	}
	item := model.PluginCatalogItem{
		ID:          manifest.ID,
		Name:        name,
		Version:     manifest.Version,
		Category:    manifest.Category,
		Description: description,
		Manifest:    manifest,
		SourceType:  "local",
		PluginType:  pluginType,
		URL:         url,
		IsLocal:     true,
		Installed:   true,
		IsEnabled:   enabled,
		Status:      status,
		Health:      healthPtr,
	}
	item.AvailableActions = buildCatalogActions(item)
	if priority > 0 {
		item.Manifest.Resource.Priority = priority
	}
	return item
}

func (s *PluginCatalogService) loadRemoteCatalog() (model.PluginCatalogResponse, error) {
	if strings.TrimSpace(s.pluginRegistryURL) != "" {
		if catalog, err := s.fetchRemoteCatalog(s.pluginRegistryURL); err == nil {
			catalog.Source = "remote"
			return catalog, nil
		}
	}
	catalog, err := s.readDefaultCatalog()
	if err != nil {
		return model.PluginCatalogResponse{}, err
	}
	catalog.Source = "default"
	return catalog, nil
}

func (s *PluginCatalogService) fetchRemoteCatalog(url string) (model.PluginCatalogResponse, error) {
	client := s.remoteCatalogClient
	if client == nil {
		client = defaultPluginCatalogHTTPClient()
	}
	resp, err := client.Get(url)
	if err != nil {
		return model.PluginCatalogResponse{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return model.PluginCatalogResponse{}, fmt.Errorf("远程市场返回状态码 %d", resp.StatusCode)
	}
	var catalog model.PluginCatalogResponse
	if err := json.NewDecoder(resp.Body).Decode(&catalog); err != nil {
		return model.PluginCatalogResponse{}, err
	}
	return catalog, nil
}

func (s *PluginCatalogService) readDefaultCatalog() (model.PluginCatalogResponse, error) {
	path := s.defaultCatalogPath
	if strings.TrimSpace(path) == "" {
		path = resolveDefaultPluginCatalogPath()
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return model.PluginCatalogResponse{}, fmt.Errorf("读取默认插件市场失败: %w", err)
	}
	var catalog model.PluginCatalogResponse
	if err := json.Unmarshal(data, &catalog); err != nil {
		return model.PluginCatalogResponse{}, fmt.Errorf("解析默认插件市场失败: %w", err)
	}
	return catalog, nil
}

func normalizeRemoteCatalogItem(item model.PluginCatalogItem) model.PluginCatalogItem {
	item.ID = strings.TrimSpace(item.ID)
	item.Name = strings.TrimSpace(item.Name)
	if item.Name == "" {
		item.Name = strings.TrimPrefix(item.ID, "search.")
	}
	if item.ID == "" {
		item.ID = "search." + item.Name
	}
	if strings.TrimSpace(item.Version) == "" {
		item.Version = item.Manifest.Version
	}
	if strings.TrimSpace(item.Category) == "" {
		item.Category = item.Manifest.Category
	}
	if strings.TrimSpace(item.Description) == "" {
		item.Description = item.Manifest.Description
	}
	item.Manifest = normalizeCatalogManifest(item.Manifest, item)
	item.SourceType = "remote"
	item.IsRemote = true
	item.IsLocal = false
	item.Installed = false
	item.IsEnabled = false
	item.Status = "remote"
	item.AvailableActions = buildCatalogActions(item)
	return item
}

func normalizeCatalogManifest(manifest model.PluginManifest, item model.PluginCatalogItem) model.PluginManifest {
	if strings.TrimSpace(manifest.ID) == "" {
		manifest.ID = item.ID
	}
	if strings.TrimSpace(manifest.Name) == "" {
		manifest.Name = item.Name
	}
	if strings.TrimSpace(manifest.Version) == "" {
		manifest.Version = item.Version
	}
	if strings.TrimSpace(manifest.Category) == "" {
		manifest.Category = item.Category
	}
	if strings.TrimSpace(manifest.Description) == "" {
		manifest.Description = item.Description
	}
	if strings.TrimSpace(manifest.CoreVersion) == "" {
		manifest.CoreVersion = ">=1.0.0 <2.0.0"
	}
	if strings.TrimSpace(manifest.ContractVersion) == "" {
		manifest.ContractVersion = "1.0"
	}
	if len(manifest.Capabilities) == 0 {
		manifest.Capabilities = []string{"resource.search"}
	}
	if len(manifest.Permissions) == 0 {
		manifest.Permissions = []string{"network"}
	}
	if manifest.ConfigSchema == nil {
		manifest.ConfigSchema = []model.PluginConfigField{}
	}
	if strings.TrimSpace(manifest.Resource.SourceLabel) == "" {
		manifest.Resource.SourceLabel = manifest.Name
	}
	if strings.TrimSpace(manifest.Resource.SourceGroup) == "" {
		manifest.Resource.SourceGroup = manifest.Category
	}
	if manifest.Resource.SupportedMediaTypes == nil {
		manifest.Resource.SupportedMediaTypes = []string{}
	}
	if len(manifest.Resource.TargetTypes) == 0 {
		manifest.Resource.TargetTypes = []string{"share"}
	}
	if strings.TrimSpace(manifest.ManifestStatus) == "" {
		manifest.ManifestStatus = "complete"
	}
	return manifest
}

func mergeLocalAndRemoteCatalogItem(local model.PluginCatalogItem, remote model.PluginCatalogItem) model.PluginCatalogItem {
	merged := local
	merged.IsRemote = true
	if merged.SourceType == "local" {
		merged.SourceType = "local+remote"
	}
	if remote.Install.Type != "" {
		merged.Install = remote.Install
	}
	if len(remote.Tags) > 0 {
		merged.Tags = append([]string(nil), remote.Tags...)
	}
	if remote.Homepage != "" {
		merged.Homepage = remote.Homepage
	}
	if remote.Author != "" {
		merged.Author = remote.Author
	}
	if merged.Description == "" {
		merged.Description = remote.Description
	}
	merged.AvailableActions = buildCatalogActions(merged)
	return merged
}

func buildCatalogActions(item model.PluginCatalogItem) []string {
	if !item.Installed {
		if item.Install.Type == "custom_url" && strings.TrimSpace(item.Install.URL) != "" {
			return []string{"install"}
		}
		return []string{}
	}

	actions := []string{"configure", "test"}
	if item.IsEnabled {
		actions = append(actions, "disable")
	} else {
		actions = append(actions, "enable")
	}
	if item.PluginType == "custom" {
		actions = append(actions, "delete")
	}
	return actions
}

func sortCatalogItems(items []model.PluginCatalogItem) []model.PluginCatalogItem {
	result := append([]model.PluginCatalogItem(nil), items...)
	sort.SliceStable(result, func(i, j int) bool {
		if result[i].Installed != result[j].Installed {
			return result[i].Installed
		}
		if result[i].Category != result[j].Category {
			return result[i].Category < result[j].Category
		}
		return result[i].Name < result[j].Name
	})
	return result
}

// InstallCatalogItem 导入远程市场中的 custom_url 插件，重复安装保持幂等。
func (s *PluginCatalogService) InstallCatalogItem(req model.PluginCatalogInstallRequest) (model.PluginCatalogItem, error) {
	id := strings.TrimSpace(req.ID)
	if id == "" {
		return model.PluginCatalogItem{}, errors.New("插件市场条目 ID 不能为空")
	}

	catalog, err := s.ListCatalog("remote", false)
	if err != nil {
		return model.PluginCatalogItem{}, err
	}

	var target *model.PluginCatalogItem
	for i := range catalog.Items {
		if strings.EqualFold(catalog.Items[i].ID, id) || strings.EqualFold(catalog.Items[i].Name, id) {
			target = &catalog.Items[i]
			break
		}
	}
	if target == nil {
		return model.PluginCatalogItem{}, errors.New("插件市场条目不存在")
	}
	if target.Install.Type != "custom_url" || strings.TrimSpace(target.Install.URL) == "" {
		return model.PluginCatalogItem{}, errors.New("当前仅支持导入 custom_url 插件")
	}

	if s.customPlugins == nil {
		s.customPlugins = config.GetCustomPluginsConfig()
	}
	exists := false
	for _, existing := range s.customPlugins.GetPlugins() {
		if strings.EqualFold(existing.Name, target.Name) {
			exists = true
			break
		}
	}
	if !exists {
		if err := s.customPlugins.AddPlugin(config.CustomPlugin{
			Name:         target.Name,
			URL:          target.Install.URL,
			Priority:     resolveCatalogInstallPriority(*target),
			Description:  target.Description,
			Enabled:      true,
			Version:      target.Version,
			Category:     target.Category,
			Capabilities: append([]string(nil), target.Manifest.Capabilities...),
		}); err != nil {
			return model.PluginCatalogItem{}, fmt.Errorf("导入插件失败: %w", err)
		}
	}

	if s.pluginStateService != nil {
		if err := s.pluginStateService.SetStatus(target.Name, "custom", true); err != nil {
			return model.PluginCatalogItem{}, fmt.Errorf("同步插件启用状态失败: %w", err)
		}
	}

	installedManifest := buildCatalogCustomManifest(config.CustomPlugin{
		Name:         target.Name,
		URL:          target.Install.URL,
		Priority:     resolveCatalogInstallPriority(*target),
		Description:  target.Description,
		Enabled:      true,
		Version:      target.Version,
		Category:     target.Category,
		Capabilities: append([]string(nil), target.Manifest.Capabilities...),
	})
	installed := buildInstalledCatalogItem(target.Name, "custom", resolveCatalogInstallPriority(*target), target.Install.URL, target.Description, installedManifest, true, model.PluginHealthSnapshot{})
	installed.IsRemote = true
	installed.SourceType = "local+remote"
	installed.Install = target.Install
	installed.Tags = append([]string(nil), target.Tags...)
	installed.Homepage = target.Homepage
	installed.Author = target.Author
	installed.AvailableActions = buildCatalogActions(installed)
	return installed, nil
}

func resolveCatalogInstallPriority(item model.PluginCatalogItem) int {
	if item.Manifest.Resource.Priority > 0 {
		return item.Manifest.Resource.Priority
	}
	return 3
}

func buildCatalogCustomManifest(cp config.CustomPlugin) model.PluginManifest {
	category := strings.TrimSpace(cp.Category)
	if category == "" {
		category = "search"
	}
	version := strings.TrimSpace(cp.Version)
	if version == "" {
		version = "0.0.0"
	}
	capabilities := append([]string(nil), cp.Capabilities...)
	if len(capabilities) == 0 {
		capabilities = []string{"resource.search"}
	}

	return model.PluginManifest{
		ID:              "search." + strings.TrimSpace(cp.Name),
		Name:            cp.Name,
		Version:         version,
		Category:        category,
		Description:     cp.Description,
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    capabilities,
		Permissions:     []string{"network"},
		ConfigSchema: []model.PluginConfigField{
			{
				Key:         "url",
				Label:       "搜索接口 URL",
				Type:        "string",
				Required:    true,
				Default:     cp.URL,
				Description: "自定义插件的远程搜索接口地址。",
			},
		},
		Resource: model.ResourceDescriptor{
			SourceLabel:         cp.Name,
			SourceGroup:         category,
			SupportedMediaTypes: []string{},
			TargetTypes:         []string{"share"},
			Priority:            cp.Priority,
		},
		UI: model.PluginUIMetadata{
			Menus:            []string{},
			SettingsSections: []string{},
			TaskTemplates:    []string{},
		},
		ManifestStatus: "generated",
	}
}
