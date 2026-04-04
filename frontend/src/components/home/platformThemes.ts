import { CloudType, type CloudTypeValue } from '@/types/api';

export type PlatformTheme = {
  type: CloudTypeValue;
  name: string;
  color: string;
  shadow: string;
};

export const platformThemes: PlatformTheme[] = [
  { type: CloudType.BAIDU, name: '百度网盘', color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30' },
  { type: CloudType.ALIYUN, name: '阿里云盘', color: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/30' },
  { type: CloudType.QUARK, name: '夸克网盘', color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/30' },
  { type: CloudType.TIANYI, name: '天翼云盘', color: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/30' },
  { type: CloudType.UC, name: 'UC网盘', color: 'from-green-500 to-green-600', shadow: 'shadow-green-500/30' },
  { type: CloudType.MOBILE, name: '移动云盘', color: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/30' },
  { type: CloudType.ONE_ONE_FIVE, name: '115网盘', color: 'from-red-500 to-red-600', shadow: 'shadow-red-500/30' },
  { type: CloudType.XUNLEI, name: '迅雷网盘', color: 'from-yellow-500 to-yellow-600', shadow: 'shadow-yellow-500/30' },
  { type: CloudType.ONE_TWO_THREE, name: '123网盘', color: 'from-teal-500 to-teal-600', shadow: 'shadow-teal-500/30' },
  { type: CloudType.MAGNET, name: '磁力链接', color: 'from-gray-600 to-gray-700', shadow: 'shadow-gray-500/30' },
  { type: CloudType.LANZOU, name: '蓝奏云', color: 'from-blue-600 to-blue-700', shadow: 'shadow-blue-600/30' },
];

export const platformThemeTypes = platformThemes.map((theme) => theme.type);
