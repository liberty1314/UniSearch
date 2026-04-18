import { CloudType, type CloudTypeValue } from '@/types/api';

export type PlatformTheme = {
  type: CloudTypeValue;
  name: string;
  color: string;
  shadow: string;
};

export const platformThemes: PlatformTheme[] = [
  { type: CloudType.BAIDU, name: '百度网盘', color: 'bg-blue-500', shadow: 'shadow-blue-500/30' },
  { type: CloudType.ALIYUN, name: '阿里云盘', color: 'bg-orange-500', shadow: 'shadow-orange-500/30' },
  { type: CloudType.QUARK, name: '夸克网盘', color: 'bg-purple-500', shadow: 'shadow-purple-500/30' },
  { type: CloudType.TIANYI, name: '天翼云盘', color: 'bg-cyan-500', shadow: 'shadow-cyan-500/30' },
  { type: CloudType.UC, name: 'UC网盘', color: 'bg-green-500', shadow: 'shadow-green-500/30' },
  { type: CloudType.MOBILE, name: '移动云盘', color: 'bg-indigo-500', shadow: 'shadow-indigo-500/30' },
  { type: CloudType.ONE_ONE_FIVE, name: '115网盘', color: 'bg-red-500', shadow: 'shadow-red-500/30' },
  { type: CloudType.XUNLEI, name: '迅雷网盘', color: 'bg-yellow-500', shadow: 'shadow-yellow-500/30' },
  { type: CloudType.ONE_TWO_THREE, name: '123网盘', color: 'bg-teal-500', shadow: 'shadow-teal-500/30' },
  { type: CloudType.MAGNET, name: '磁力链接', color: 'bg-slate-600', shadow: 'shadow-gray-500/30' },
  { type: CloudType.LANZOU, name: '蓝奏云', color: 'bg-sky-500', shadow: 'shadow-blue-600/30' },
];

export const platformThemeTypes = platformThemes.map((theme) => theme.type);
