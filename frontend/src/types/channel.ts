// Telegram 频道管理相关类型。

export interface TGChannel {
  id: number;
  name: string;
  is_enabled: boolean;
  sort_order: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  health_status?: 'healthy' | 'error' | 'untested';
  last_checked_at?: string | null;
  last_error?: string;
  check_source?: 'manual_test' | 'batch_test' | 'system' | string;
}

export interface BatchChannelStatusRequest {
  channel_ids: number[];
  is_enabled: boolean;
}

export interface BatchDeleteChannelsRequest {
  channel_ids: number[];
}

export interface BatchChannelOperationError {
  channel_id: number;
  error: string;
  code: string;
}

export interface BatchChannelOperationResponse {
  success_count: number;
  failed_count: number;
  success: number[];
  failed: BatchChannelOperationError[];
}

export interface ChannelHealthSummary {
  total: number;
  healthy: number;
  error: number;
  untested: number;
  enabled_error: number;
}

export interface ListTGChannelsResponse {
  channels: TGChannel[];
  total: number;
  health_summary?: ChannelHealthSummary;
}
