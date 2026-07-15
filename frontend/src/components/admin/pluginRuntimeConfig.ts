import type { PluginConfigField } from '@/types/plugin';

type PluginRuntimeConfigBuildResult =
  | { config: Record<string, unknown>; error?: never }
  | { config?: never; error: string };

function configFieldLabel(field: PluginConfigField): string {
  return field.label || field.key;
}

export function buildPluginRuntimeConfig(
  schema: PluginConfigField[],
  values: Record<string, unknown>,
): PluginRuntimeConfigBuildResult {
  const config: Record<string, unknown> = {};
  const fieldsByKey = new Map(schema.map((field) => [field.key, field]));

  for (const field of schema) {
    const value = values[field.key] ?? field.default;
    if (field.type !== 'number') {
      config[field.key] = value;
      continue;
    }

    const numberValue = Number(value);
    const label = configFieldLabel(field);
    if (!Number.isFinite(numberValue)) {
      return { error: `${label}必须是数字` };
    }
    if (field.integer && !Number.isInteger(numberValue)) {
      return { error: `${label}必须是整数` };
    }
    if (field.minimum !== undefined && numberValue < field.minimum) {
      return { error: `${label}不能小于 ${field.minimum}` };
    }
    if (field.maximum !== undefined && numberValue > field.maximum) {
      return { error: `${label}不能大于 ${field.maximum}` };
    }
    config[field.key] = numberValue;
  }

  for (const field of schema) {
    const otherKey = field.less_than_or_equal_to;
    if (!otherKey) {
      continue;
    }
    const value = config[field.key];
    const otherValue = config[otherKey];
    if (typeof value !== 'number' || typeof otherValue !== 'number' || value <= otherValue) {
      continue;
    }
    const otherField = fieldsByKey.get(otherKey);
    const otherLabel = otherField ? configFieldLabel(otherField) : otherKey;
    return { error: `${configFieldLabel(field)}不能大于${otherLabel}` };
  }

  return { config };
}
