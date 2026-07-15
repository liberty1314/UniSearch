import { describe, expect, it } from 'vitest';
import type { PluginConfigField } from '@/types/plugin';
import { buildPluginRuntimeConfig } from './pluginRuntimeConfig';

const seedHubSchema: PluginConfigField[] = [
  {
    key: 'max_resource_entries_per_type',
    label: '每类资源获取数量',
    type: 'number',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 40,
    integer: true,
  },
  {
    key: 'pre_resolved_link_start_per_type',
    label: '每类完整解析数量',
    type: 'number',
    required: false,
    default: 0,
    minimum: 0,
    maximum: 20,
    integer: true,
    less_than_or_equal_to: 'max_resource_entries_per_type',
  },
];

describe('buildPluginRuntimeConfig', () => {
  it.each([
    [{ max_resource_entries_per_type: 0, pre_resolved_link_start_per_type: 0 }, '每类资源获取数量不能小于 1'],
    [{ max_resource_entries_per_type: 41, pre_resolved_link_start_per_type: 0 }, '每类资源获取数量不能大于 40'],
    [{ max_resource_entries_per_type: 10.5, pre_resolved_link_start_per_type: 0 }, '每类资源获取数量必须是整数'],
    [{ max_resource_entries_per_type: 10, pre_resolved_link_start_per_type: 11 }, '每类完整解析数量不能大于每类资源获取数量'],
  ])('rejects invalid config %#', (values, expectedError) => {
    expect(buildPluginRuntimeConfig(seedHubSchema, values)).toEqual({ error: expectedError });
  });

  it('builds a valid numeric config payload', () => {
    expect(buildPluginRuntimeConfig(seedHubSchema, {
      max_resource_entries_per_type: '10',
      pre_resolved_link_start_per_type: '3',
    })).toEqual({
      config: {
        max_resource_entries_per_type: 10,
        pre_resolved_link_start_per_type: 3,
      },
    });
  });
});
