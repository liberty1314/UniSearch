import type { TGChannel } from "@/types/channel";

export type ChannelTestStatus = 'idle' | 'testing' | 'success' | 'error';

export const CHANNEL_PAGE_SIZE = 10;

export const normalizeChannelHealth = (
  channel: TGChannel
): 'healthy' | 'error' | 'untested' => channel.health_status || 'untested';

export const describeChannelHealth = (channel: TGChannel): string => {
  const health = normalizeChannelHealth(channel);
  if (health === 'healthy') return '正常';
  if (health === 'error') return '异常';
  return '未测试';
};
