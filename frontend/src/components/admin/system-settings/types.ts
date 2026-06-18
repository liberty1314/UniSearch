export type SystemSettingsSectionId =
  | 'account'
  | 'search'
  | 'runtime'
  | 'cache'
  | 'external'
  | 'display';

export interface SystemSettingsSection {
  id: SystemSettingsSectionId;
  label: string;
  description: string;
}

export const SYSTEM_SETTINGS_SECTIONS: SystemSettingsSection[] = [
  {
    id: 'account',
    label: '账号与访问',
    description: '登录、注册和用户体系开关',
  },
  {
    id: 'search',
    label: '搜索体验',
    description: '前台搜索展示与详情入口',
  },
  {
    id: 'runtime',
    label: '运行配置',
    description: '并发、异步插件和代理参数',
  },
  {
    id: 'cache',
    label: '缓存与预热',
    description: 'Redis 缓存策略和热门榜单预热',
  },
  {
    id: 'external',
    label: '外部服务',
    description: '第三方服务令牌和连接配置',
  },
  {
    id: 'display',
    label: '站点展示',
    description: '公开站点地址和展示信息',
  },
];

