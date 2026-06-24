import type { CloudTypeValue } from '@/types/search';

// 插件目录、插件配置和批量操作相关类型。

export interface CloudTypeConfig {
  type: CloudTypeValue;
  name: string;
  color: string;
  icon?: string;
}

export interface PluginInfo {
  name: string;
  priority: number;
  status: 'active' | 'inactive' | 'error' | 'custom';
  plugin_type: 'builtin' | 'custom';
  is_enabled: boolean;
  description: string;
  url?: string;
  id?: string;
  version?: string;
  category?: string;
  source_type?: string;
  core_version?: string;
  contract_version?: string;
  capabilities?: string[];
  permissions?: string[];
  config_schema?: PluginConfigField[];
  resource?: ResourceDescriptor;
  ui?: PluginUIMetadata;
  manifest_status?: 'complete' | 'generated' | string;
  manifest?: PluginManifestPayload;
  install?: PluginCatalogInstall;
  tags?: string[];
  homepage?: string;
  author?: string;
  is_local?: boolean;
  is_remote?: boolean;
  installed?: boolean;
  health?: PluginHealthSnapshot;
  available_actions?: string[];
}

export interface PluginManifestPayload {
  id: string;
  name: string;
  version: string;
  category: string;
  description?: string;
  core_version?: string;
  contract_version?: string;
  capabilities?: string[];
  permissions?: string[];
  config_schema?: PluginConfigField[];
  resource?: ResourceDescriptor;
  ui?: PluginUIMetadata;
  manifest_status?: string;
}

export interface PluginCatalogInstall {
  type: string;
  url?: string;
}

export interface PluginHealthSnapshot {
  is_healthy: boolean;
  last_checked_at?: string;
  last_error?: string;
  check_source?: string;
}

export interface PluginConfigField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  default?: unknown;
  description?: string;
  secret?: boolean;
  group?: string;
}

export interface ResourceDescriptor {
  source_label: string;
  source_group: string;
  supported_media_types: string[];
  target_types: string[];
  priority: number;
  skip_service_filter?: boolean;
}

export interface PluginUIMetadata {
  menus: string[];
  settings_sections: string[];
  task_templates: string[];
}

export interface PluginCatalogResponse {
  version: string;
  source: string;
  items: PluginInfo[];
}

export interface PluginRuntimeConfigResponse {
  plugin_name: string;
  config: Record<string, unknown>;
}

export interface BatchPluginStatusRequest {
  plugin_names: string[];
  is_enabled: boolean;
}

export interface BatchPluginOperationError {
  plugin_name: string;
  error: string;
  code: string;
}

export interface BatchPluginOperationResponse {
  success_count: number;
  failed_count: number;
  success: string[];
  failed: BatchPluginOperationError[];
}
