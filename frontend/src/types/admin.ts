// 后台通用弹窗与标签类型。

export type AdminDialogMode = 'view' | 'edit';

export type AdminTagScope = 'plugin' | 'channel';

export interface AdminTagOption {
  id: number;
  name: string;
  scope: AdminTagScope;
}

export interface AdminTagListResponse {
  items: AdminTagOption[];
}

export interface CreateAdminTagRequest {
  scope: AdminTagScope;
  name: string;
}

export interface CreateAdminTagResponse {
  success: boolean;
  item: AdminTagOption;
}

export interface UpdateAdminTagRequest {
  name: string;
}

export interface UpdateAdminTagResponse {
  success: boolean;
  item: AdminTagOption;
}

export interface DeleteAdminTagResponse {
  success: boolean;
}
