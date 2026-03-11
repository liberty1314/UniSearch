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
          "relative flex items-center px-4 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 border box-border",
          isSelected
            ? `bg-gradient-to-r ${config.color} text-white border-transparent ${config.shadow} shadow-lg ring-2 ring-white/20 dark:ring-black/20`
            : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm"
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
        <div className="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/50 dark:border-white/10 shadow-glass">

          {/* 顶部栏：标题与全选 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500 dark:text-blue-400 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div className="min-w-[150px]">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">来源筛选</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                  {isAllSelected ? '已展示全网资源' : `已选中 ${selectedTypes.length} 个来源`}
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSelectAll}
              className={cn(
                "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 shadow-sm flex-shrink-0",
                isAllSelected
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-lg"
                  : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {isAllSelected ? <IoCheckmarkCircle className="w-5 h-5" /> : <IoEllipseOutline className="w-5 h-5" />}
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
