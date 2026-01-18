import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FilterOption {
    label: string;
    value: string;
    color?: string;
}

interface TableFilterDropdownProps {
    options: FilterOption[];
    selectedValues: string[];
    onSelectionChange: (values: string[]) => void;
    multiSelect?: boolean;
    icon?: React.ReactNode;
}

/**
 * 表格筛选下拉组件（仅图标版本）
 * 提供优雅的多选/单选筛选功能
 * 使用 Portal 渲染到 body，避免被父容器的 overflow 裁剪
 */
export const TableFilterDropdown: React.FC<TableFilterDropdownProps> = ({
    options,
    selectedValues,
    onSelectionChange,
    multiSelect = true,
    icon,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    // 计算下拉框位置
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 8, // 8px 间距
                left: rect.right + window.scrollX - 140, // 140px 是下拉框宽度，右对齐
            });
        }
    }, [isOpen]);

    const handleToggle = (value: string) => {
        if (multiSelect) {
            if (selectedValues.includes(value)) {
                onSelectionChange(selectedValues.filter(v => v !== value));
            } else {
                onSelectionChange([...selectedValues, value]);
            }
            // 多选模式下也立即关闭下拉框
            setIsOpen(false);
        } else {
            if (selectedValues.includes(value)) {
                onSelectionChange([]);
            } else {
                onSelectionChange([value]);
            }
            setIsOpen(false);
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectionChange([]);
    };

    const hasSelection = selectedValues.length > 0;

    return (
        <>
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`
                    group flex items-center justify-center w-7 h-7 rounded-md
                    transition-all duration-200
                    ${hasSelection
                        ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                `}
                title="筛选"
            >
                {icon || <Filter className="w-3.5 h-3.5" />}
            </button>

            {isOpen && createPortal(
                <AnimatePresence>
                    <>
                        {/* 背景遮罩 */}
                        <div
                            className="fixed inset-0 z-[9998]"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                        />

                        {/* 下拉菜单 - 使用 fixed 定位 */}
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            style={{
                                position: 'fixed',
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`,
                                zIndex: 9999,
                            }}
                            className="w-[140px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden"
                        >
                            <div className="p-2 space-y-0.5">
                                {options.map((option, index) => {
                                    const isSelected = selectedValues.includes(option.value);
                                    return (
                                        <motion.button
                                            key={option.value}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleToggle(option.value);
                                            }}
                                            className={`
                                                w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm
                                                transition-all duration-150
                                                ${isSelected
                                                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                                }
                                            `}
                                        >
                                            <span className="flex items-center gap-2">
                                                {option.color && (
                                                    <span
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: option.color }}
                                                    />
                                                )}
                                                {option.label}
                                            </span>
                                            {isSelected && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                >
                                                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {multiSelect && hasSelection && (
                                <div className="border-t border-slate-200 dark:border-slate-700 p-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleClear(e);
                                            setIsOpen(false);
                                        }}
                                        className="w-full text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                                    >
                                        <X className="w-3 h-3 mr-1" />
                                        清除筛选
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};
