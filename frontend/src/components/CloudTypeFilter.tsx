import React, { useEffect, memo, useRef } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { IoCheckmarkCircle, IoEllipseOutline } from 'react-icons/io5';
import { CloudType, CloudTypeValue } from '@/types/api';
import { useSearchStore } from '@/stores/searchStore';
import { cn } from '@/lib/utils';
import { CoolMode } from '@/components/magicui/cool-mode';

// --- Sub-components ---

interface CloudTypeTagProps {
  config: {
    type: string;
    name: string;
    color: string;
    shadow: string;
  };
  isSelected: boolean;
  onToggle: (type: CloudTypeValue) => void;
}

const CloudTypeTag = memo(({ config, isSelected, onToggle }: CloudTypeTagProps) => {
  return (
    <CoolMode options={{ particleCount: 12, speedHorz: 5, speedUp: 15 }}>
      <motion.button
        layout
        onClick={() => onToggle(config.type as CloudTypeValue)}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative flex items-center px-4 py-2.5 rounded-xl text-[13.5px] font-bold transition-all duration-300 border box-border",
          isSelected
            ? `bg-gradient-to-r ${config.color} text-white border-transparent ${config.shadow} shadow-lg ring-2 ring-white/30 dark:ring-white/10 dark:border-white/10 dark:shadow-none`
            : "bg-white/50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-white/[0.06] hover:bg-white/80 dark:hover:bg-white/[0.08] shadow-sm hover:shadow-md dark:shadow-none hover:-translate-y-0.5"
        )}
      >


        {/* 文本内容 */}
        <span>{config.name}</span>
      </motion.button>
    </CoolMode>
  );
});

CloudTypeTag.displayName = 'CloudTypeTag';

// --- Main Component ---

/**
 * 网盘类型筛选器组件 - Premium Design & Zero Layout Shift
 */
const CloudTypeFilter: React.FC = () => {
  const { searchParams, setSearchParams } = useSearchStore();

  const cloudTypeConfigs = [
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

  const allTypes = cloudTypeConfigs.map(config => config.type as CloudTypeValue);
  const hasInitializedCloudTypesRef = useRef(false);

  useEffect(() => {
    if (hasInitializedCloudTypesRef.current) {
      return;
    }

    const currentTypes = searchParams.cloudTypes || [];
    const validTypes = currentTypes.filter(type => allTypes.includes(type));

    if (currentTypes.length === 0 || validTypes.length !== currentTypes.length) {
      setSearchParams({ cloudTypes: allTypes });
    }

    hasInitializedCloudTypesRef.current = true;
  }, [allTypes, searchParams.cloudTypes, setSearchParams]);

  const selectedTypes = searchParams.cloudTypes || [];
  const isAllSelected = selectedTypes.length === cloudTypeConfigs.length;

  const handleTypeToggle = (type: CloudTypeValue) => {
    const currentTypes = searchParams.cloudTypes || [];
    let newTypes: CloudTypeValue[];

    if (currentTypes.includes(type)) {
      newTypes = currentTypes.filter(t => t !== type);
    } else {
      newTypes = [...currentTypes, type];
    }
    setSearchParams({ cloudTypes: newTypes });
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSearchParams({ cloudTypes: [] });
    } else {
      setSearchParams({ cloudTypes: allTypes });
    }
  };

  const isTypeSelected = (type: CloudTypeValue) => searchParams.cloudTypes?.includes(type) ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-5xl mx-auto mt-6"
    >
      <div className="relative">
        {/* 内容容器 */}
        <div
          data-testid="cloud-type-filter-surface"
          className="p-6 sm:p-8 rounded-[2rem] bg-white/60 dark:bg-slate-950/40 backdrop-blur-3xl border border-white/60 dark:border-white/[0.06] shadow-[0_12px_40px_rgba(15,23,42,0.04)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-300"
        >

          {/* 顶部栏：标题与全选 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-blue-50/80 dark:border dark:border-white/[0.08] dark:bg-white/[0.04] rounded-[14px] text-blue-600 dark:text-slate-200 flex-shrink-0 shadow-sm shadow-blue-500/10 dark:shadow-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div className="min-w-[150px]">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">来源筛选</h3>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">
                  {isAllSelected ? '已展示全网资源平台' : `已精准定位 ${selectedTypes.length} 个来源`}
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSelectAll}
              className={cn(
                "px-5 py-2.5 rounded-[14px] font-bold text-[13.5px] transition-all duration-300 flex items-center gap-2 shadow-sm flex-shrink-0 active:scale-95",
                isAllSelected
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 hover:shadow-lg dark:shadow-none"
                  : "bg-white/60 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.06] hover:bg-white/90 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="w-[18px] h-[18px] flex items-center justify-center">
                {isAllSelected ? <IoCheckmarkCircle className="w-[18px] h-[18px]" /> : <IoEllipseOutline className="w-[18px] h-[18px]" />}
              </div>
              <span className="min-w-[4em] text-center">{isAllSelected ? '全选状态' : '选择全部'}</span>
            </motion.button>
          </div>

          {/* 筛选标签网格 */}
          <LayoutGroup>
            <motion.div layout className="flex flex-wrap gap-3">
              {cloudTypeConfigs.map((config) => (
                <CloudTypeTag
                  key={config.type}
                  config={config}
                  isSelected={isTypeSelected(config.type as CloudTypeValue)}
                  onToggle={handleTypeToggle}
                />
              ))}
            </motion.div>
          </LayoutGroup>
        </div>
      </div>
    </motion.div>
  );
};

export default CloudTypeFilter;
