import type { TGChannel } from "@/types/channel";

export const updateChannelEnabledState = (
  channels: TGChannel[],
  channelId: number,
  isEnabled: boolean
): TGChannel[] =>
  channels.map((channel) =>
    channel.id === channelId ? { ...channel, is_enabled: isEnabled } : channel
  );

export const applyBatchChannelEnabledState = (
  channels: TGChannel[],
  successSet: Set<number>,
  isEnabled: boolean
): TGChannel[] =>
  channels.map((channel) =>
    successSet.has(channel.id) ? { ...channel, is_enabled: isEnabled } : channel
  );

export const removeChannelsById = (
  channels: TGChannel[],
  idsToRemove: Set<number>
): TGChannel[] => channels.filter((channel) => !idsToRemove.has(channel.id));
