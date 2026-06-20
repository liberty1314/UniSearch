import React, { memo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { CloudTypeValue } from "@/types/search";
import { cn } from "@/lib/utils";
import {
  platformThemes,
  type PlatformTheme,
} from "@/components/home/platformThemes";

/** 单击与双击之间的判定间隔（毫秒），用于区分单击多选与双击仅看此源 */
const CLICK_DELAY_MS = 220;

// ─── 单个网盘胶囊标签 ─────────────────────────────────────────────────────────

interface CloudTypeChipProps {
  config: PlatformTheme;
  isSelected: boolean;
  /** 是否启用双击「仅选此项」行为 */
  selectOnlyEnabled: boolean;
  /** 是否启用悬停和按压视觉反馈 */
  interactionEffects: boolean;
  onToggle: (type: CloudTypeValue) => void;
  onSelectOnly: (type: CloudTypeValue) => void;
}

/**
 * 网盘胶囊标签。
 *
 * 行为约定：
 * - 单击：切换选中态（多选）。
 * - 双击（仅 selectOnlyEnabled）：仅选中当前项，取消其余。
 *
 * 单击与双击通过 CLICK_DELAY_MS 延迟判定，避免误触。
 */
const CloudTypeChip = memo(
  ({
    config,
    isSelected,
    selectOnlyEnabled,
    interactionEffects,
    onToggle,
    onSelectOnly,
  }: CloudTypeChipProps) => {
    const clickTimerRef = useRef<number | null>(null);

    const clearClickTimer = () => {
      if (clickTimerRef.current) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };

    useEffect(() => {
      return () => {
        clearClickTimer();
      };
    }, []);

    const handleClick = () => {
      // 禁用双击「仅选此项」时无需区分单/双击，立即响应，体验更跟手。
      if (!selectOnlyEnabled) {
        onToggle(config.type);
        return;
      }
      clearClickTimer();
      clickTimerRef.current = window.setTimeout(() => {
        onToggle(config.type);
        clickTimerRef.current = null;
      }, CLICK_DELAY_MS);
    };

    const handleDoubleClick = () => {
      if (!selectOnlyEnabled) {
        return;
      }
      clearClickTimer();
      onSelectOnly(config.type);
    };

    const ariaSuffix = selectOnlyEnabled
      ? isSelected
        ? "（已选中，单击取消，双击仅看此源）"
        : "（未选中，单击选择，双击仅看此源）"
      : isSelected
        ? "（已选中，单击取消）"
        : "（未选中，单击选择）";

    return (
      <motion.button
        layout={interactionEffects ? true : undefined}
        type="button"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        whileHover={interactionEffects ? { scale: 1.05, y: -2 } : undefined}
        whileTap={interactionEffects ? { scale: 0.95 } : undefined}
        aria-pressed={isSelected}
        aria-label={`${config.name}${ariaSuffix}`}
        className={cn(
          "relative flex items-center rounded-[1rem] border px-5 py-2.5 text-[13.5px] font-semibold box-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
          interactionEffects && "transition-colors transition-shadow duration-300",
          isSelected
            ? `bg-gradient-to-br ${config.color} text-white border-transparent ${config.shadow} shadow-[0_8px_20px_rgba(14,165,233,0.2)] dark:shadow-none ring-[0.5px] ring-white/50 dark:ring-white/10`
            : cn(
                "bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-[0.5px] border-slate-200/50 dark:border-white/10 shadow-sm backdrop-blur-md",
                interactionEffects && "hover:bg-white/60 dark:hover:bg-slate-700/40 hover:shadow-md",
              ),
        )}
      >
        <span>{config.name}</span>
      </motion.button>
    );
  },
);

CloudTypeChip.displayName = "CloudTypeChip";

// ─── 胶囊标签组 ───────────────────────────────────────────────────────────────

export interface CloudTypeChipGroupProps {
  /** 当前选中的网盘类型（受控） */
  selected: CloudTypeValue[];
  /** 选中态变更回调 */
  onChange: (next: CloudTypeValue[]) => void;
  /**
   * 是否启用双击「仅选此项」行为。
   * 搜索页和个人中心偏好页默认使用一致交互。
   */
  selectOnlyEnabled?: boolean;
  /**
   * 是否启用悬停、按压等视觉交互反馈。
   * 搜索页和个人中心偏好页默认使用一致动效。
   */
  interactionEffects?: boolean;
  /** 布局：搜索页居中换行，偏好页自适应填充 */
  layout?: "wrap-center" | "flex-left";
  /**
   * 双行对称分割点。设置后标签按该下标分为上下两行各自居中换行，
   * 用于搜索页 6+5 对称排布；不设置则单行自适应换行。
   */
  splitIndex?: number;
  /** 供测试定位根容器 */
  "data-testid"?: string;
}

/**
 * 网盘类型胶囊标签组（受控组件）。
 *
 * 数据源为 `platformThemes`（派生自 `cloudTypeUtils.ts` 单一数据源），
 * 搜索页与偏好设置页共享同一套渲染逻辑，消除视觉与数据割裂。
 */
const CloudTypeChipGroup: React.FC<CloudTypeChipGroupProps> = ({
  selected,
  onChange,
  selectOnlyEnabled = true,
  interactionEffects = true,
  layout = "wrap-center",
  splitIndex,
  "data-testid": dataTestId,
}) => {
  const handleToggle = (type: CloudTypeValue) => {
    if (selected.includes(type)) {
      onChange(selected.filter((item) => item !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  const handleSelectOnly = (type: CloudTypeValue) => {
    onChange([type]);
  };

  const containerClassName =
    layout === "wrap-center"
      ? "flex w-full flex-wrap justify-center gap-3"
      : "flex w-full flex-wrap gap-3";

  const renderChip = (config: PlatformTheme) => (
    <CloudTypeChip
      key={config.type}
      config={config}
      isSelected={selected.includes(config.type)}
      selectOnlyEnabled={selectOnlyEnabled}
      interactionEffects={interactionEffects}
      onToggle={handleToggle}
      onSelectOnly={handleSelectOnly}
    />
  );

  // splitIndex 为显式正数时按双行对称排布（搜索页 6+5），否则单行自适应换行
  if (typeof splitIndex === "number" && splitIndex > 0) {
    const firstRow = platformThemes.slice(0, splitIndex);
    const secondRow = platformThemes.slice(splitIndex);
    return (
      <div className="flex w-full flex-col items-center gap-3" data-testid={dataTestId}>
        <div className={containerClassName}>{firstRow.map(renderChip)}</div>
        {secondRow.length > 0 ? (
          <div className={containerClassName}>{secondRow.map(renderChip)}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={containerClassName} data-testid={dataTestId}>
      {platformThemes.map(renderChip)}
    </div>
  );
};

export default CloudTypeChipGroup;
