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

export interface ResourceLink {
  type: string;
  url: string;
  password?: string;
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
