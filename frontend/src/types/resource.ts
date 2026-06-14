// 资源对象与资源详情相关类型。

export interface ResourceCapabilities {
  searchable?: boolean;
  official_searchable?: boolean;
  share_searchable?: boolean;
  downloadable?: boolean;
  strmable?: boolean;
}

export interface ResourceAction {
  key: string;
  label: string;
  type: string;
  style?: string;
  target_plugin_id?: string;
  payload?: Record<string, unknown>;
}

export interface ResourceSource {
  type: string;
  id?: string;
  name?: string;
  channel?: string;
  plugin_id?: string;
}

export type ResourceAccessMode =
  | "direct_open"
  | "password_open"
  | "scan_transfer";

export interface ScanTransferInfo {
  provider?: string;
  qr_code_base64?: string;
  qr_code_image_url?: string;
  qr_code_value?: string;
  mobile_url?: string;
  transfer_code?: string;
  instruction?: string;
  source_page_url?: string;
  expires_hint?: string;
  refreshable?: boolean;
  refresh_key?: string;
}

export interface ScanTransferRefreshRequest {
  resource_id?: string;
  link_url: string;
  refresh_key: string;
}

export interface ScanTransferRefreshResponse {
  resource_id?: string;
  link_url: string;
  access_mode?: ResourceAccessMode;
  scan_transfer?: ScanTransferInfo;
}

export interface ResourceLink {
  type: string;
  url: string;
  password?: string;
  access_mode?: ResourceAccessMode;
  scan_transfer?: ScanTransferInfo;
  title?: string;
  work_title?: string;
  datetime?: string;
}

export interface ResourceDetail {
  url?: string;
  content?: string;
  message_id?: string;
  unique_id?: string;
}

export interface ResourceFacets {
  cloud_types: Record<string, number>;
  source_types: Record<string, number>;
  media_types: Record<string, number>;
  target_types: Record<string, number>;
  capabilities: Record<string, number>;
  action_types: Record<string, number>;
}

export interface ResourceObject {
  id: string;
  title: string;
  description?: string;
  source: ResourceSource;
  media_type?: string;
  target_type?: string;
  links: ResourceLink[];
  capabilities: ResourceCapabilities;
  actions: ResourceAction[];
  detail: ResourceDetail;
  tags?: string[];
  images?: string[];
  meta?: Record<string, unknown>;
  published_at?: string;
}

export interface ResourceDetailRouteState {
  resource?: ResourceObject;
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
    label?: string;
    keyword?: string;
  };
  routeTransition?: 'forward' | 'backward';
  transitionSource?: string;
  restoreScroll?: boolean;
  scrollY?: number;
}
