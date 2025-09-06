import React, { useEffect } from 'react';
import { CloudType, CloudTypeValue } from '@/types/api';
import { useSearchStore } from '@/stores/searchStore';
import { cn } from '@/lib/utils';
import IconButton from './IconButton';
import TagButton from './TagButton';
import { CoolMode } from '@/components/magicui/cool-mode';

/**
 * 网盘类型筛选器组件
 * 提供标签按钮形式的网盘类型筛选功能
 */
const CloudTypeFilter: React.FC = () => {
  const { searchParams, setSearchParams } = useSearchStore();
  
  // 获取所有网盘类型
  const allTypes = Object.values(CloudType) as CloudTypeValue[];
  
  // 初始化时默认全选所有类型
  useEffect(() => {
    if (searchParams.cloudTypes?.length === 0) {
      setSearchParams({ cloudTypes: allTypes });
    }
  }, []);
  
  // 网盘类型配置映射
  const cloudTypeConfigs = [
    { type: CloudType.BAIDU, name: '百度网盘', color: 'bg-blue-500 hover:bg-blue-600' },
    { type: CloudType.ALIYUN, name: '阿里云盘', color: 'bg-orange-500 hover:bg-orange-600' },
    { type: CloudType.QUARK, name: '夸克网盘', color: 'bg-purple-500 hover:bg-purple-600' },
    { type: CloudType.TIANYI, name: '天翼云盘', color: 'bg-cyan-500 hover:bg-cyan-600' },
    { type: CloudType.UC, name: 'UC网盘', color: 'bg-green-500 hover:bg-green-600' },
    { type: CloudType.MOBILE, name: '移动云盘', color: 'bg-indigo-500 hover:bg-indigo-600' },
    { type: CloudType.ONE_ONE_FIVE, name: '115网盘', color: 'bg-red-500 hover:bg-red-600' },
    { type: CloudType.PIKPAK, name: 'PikPak', color: 'bg-pink-500 hover:bg-pink-600' },
    { type: CloudType.XUNLEI, name: '迅雷网盘', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { type: CloudType.ONE_TWO_THREE, name: '123网盘', color: 'bg-teal-500 hover:bg-teal-600' },
    { type: CloudType.MAGNET, name: '磁力链接', color: 'bg-gray-600 hover:bg-gray-700' },
    { type: CloudType.ED2K, name: 'ED2K链接', color: 'bg-slate-500 hover:bg-slate-600' },
    { type: CloudType.LANZOU, name: '蓝奏云', color: 'bg-blue-600 hover:bg-blue-700' },
    { type: CloudType.ONEDRIVE, name: 'OneDrive', color: 'bg-blue-700 hover:bg-blue-800' },
    { type: CloudType.GOOGLEDRIVE, name: 'Google Drive', color: 'bg-yellow-600 hover:bg-yellow-700' },
  ];
  
  // 获取当前选中的网盘类型
  const selectedTypes = searchParams.cloudTypes || [];
  
  // 是否全选状态 - 只有当包含所有类型时才是全选状态
  const isAllSelected = selectedTypes.length === cloudTypeConfigs.length;
  
  // 切换类型选择状态
  const handleTypeToggle = (type: CloudTypeValue) => {
    const currentTypes = searchParams.cloudTypes || [];
    let newTypes: CloudTypeValue[];
    
    if (currentTypes.includes(type)) {
      // 取消选择
      newTypes = currentTypes.filter(t => t !== type);
    } else {
      // 添加选择
      newTypes = [...currentTypes, type];
    }
    
    setSearchParams({ cloudTypes: newTypes });
  };
  
  /**
   * 处理全选/取消全选
   */
  const handleSelectAll = () => {
    if (isAllSelected) {
      // 当前是全选状态，清空选择（真正取消所有选择）
      setSearchParams({ cloudTypes: [] });
    } else {
      // 当前不是全选状态，选择全部
      const allTypes = cloudTypeConfigs.map(config => config.type as CloudTypeValue);
      setSearchParams({ cloudTypes: allTypes });
    }
  };
  
  // 检查类型是否被选中
  const isTypeSelected = (type: CloudTypeValue): boolean => {
    // 当 cloudTypes 为空数组时，表示未选择任何类型
    if (searchParams.cloudTypes?.length === 0) {
      return false;
    }
    return searchParams.cloudTypes?.includes(type) ?? false;
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto mt-4">
      {/* 筛选器容器 */}
      <div className="relative hover-tilt">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-apple blur-sm transform scale-105"></div>
        
        {/* 筛选器内容 */}
        <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-apple rounded-2xl p-6 border-3d shadow-3d-soft">
          {/* 标题和全选按钮 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              网盘类型筛选
            </h3>
            <CoolMode options={{ particleCount: 18, speedHorz: 8, speedUp: 18 }}>
              <IconButton
                onClick={handleSelectAll}
                aria-label={isAllSelected ? '取消全选' : '全选'}
                className={cn(
                  'px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105',
                  isAllSelected
                    ? 'bg-apple-blue text-white hover:bg-apple-blue/90'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                {isAllSelected ? '取消全选' : '全选'}
              </IconButton>
            </CoolMode>
          </div>
          
          {/* 网盘类型标签 */}
          <div className="flex flex-wrap gap-3">
            {cloudTypeConfigs.map((config) => {
              const isSelected = isTypeSelected(config.type as CloudTypeValue);
              return (
                <CoolMode options={{ particleCount: 14, speedHorz: 8, speedUp: 18 }}>
                  <TagButton
                    key={config.type}
                    active={isSelected}
                    colorActive={`${config.color} text-white shadow-apple`}
                    onClick={() => handleTypeToggle(config.type as CloudTypeValue)}
                  >
                    {config.name}
                  </TagButton>
                </CoolMode>
              );
            })}
          </div>
          
          {/* 选择状态提示 */}
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {selectedTypes.length === 0 ? (
              '未选择任何网盘类型'
            ) : selectedTypes.length === cloudTypeConfigs.length ? (
              '已选择全部网盘类型'
            ) : (
              `已选择 ${selectedTypes.length} 个网盘类型`
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudTypeFilter;