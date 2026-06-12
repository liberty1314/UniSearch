import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toStyleVars } from '@/lib/styleVars';
import {
    ADMIN_GENTLE_SPRING,
    ADMIN_HOVERABLE_BUTTON_CLASSES,
} from '@/components/admin/adminDesign';
import {
    ADMIN_DROPDOWN_BACKDROP_Z_INDEX,
    ADMIN_DROPDOWN_ITEM_CLASSES,
    ADMIN_DROPDOWN_PANEL_CLASSES,
    computeFloatingDropdownPosition,
    estimateDropdownContentWidth,
} from './adminDropdown';

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
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 176, maxHeight: 360 });

    // 计算下拉框位置
    useEffect(() => {
        if (!isOpen || !buttonRef.current) {
            return;
        }

        const updatePosition = () => {
            if (!buttonRef.current) {
                return;
            }
            const rect = buttonRef.current.getBoundingClientRect();
            const estimatedWidth = estimateDropdownContentWidth(
                [
                    ...options.map((option) => option.label),
                    multiSelect ? '清除筛选' : '',
                ].filter(Boolean),
                {
                    minWidth: Math.max(176, rect.width),
                    maxWidth: Math.max(rect.width, Math.min(420, window.innerWidth - 24)),
                    extraWidth: 64,
                }
            );
            const next = computeFloatingDropdownPosition(rect, estimatedWidth, 360);
            setDropdownPosition(next);
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, multiSelect, options]);

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
                    group flex h-7 w-7 items-center justify-center rounded-full
                    border-[0.5px] transition-all duration-200
                    ${hasSelection
                        ? 'border-cyan-200/60 bg-cyan-50/80 text-cyan-600 shadow-sm dark:border-cyan-900/30 dark:bg-cyan-950/30 dark:text-cyan-300'
                        : 'border-slate-200/50 bg-white/40 text-slate-400 shadow-sm backdrop-blur-md hover:text-slate-600 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:hover:text-slate-300'
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
                            className={`fixed inset-0 ${ADMIN_DROPDOWN_BACKDROP_Z_INDEX} bg-transparent`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                        />

                        {/* 下拉菜单 - 使用 fixed 定位 */}
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={ADMIN_GENTLE_SPRING}
                            style={{
                                top: dropdownPosition.top,
                                left: dropdownPosition.left,
                                width: dropdownPosition.width,
                                maxHeight: dropdownPosition.maxHeight,
                            }}
                            className={`${ADMIN_DROPDOWN_PANEL_CLASSES} fixed z-[110] overflow-hidden`}
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
                                                ${ADMIN_DROPDOWN_ITEM_CLASSES}
                                                w-full flex items-center justify-between rounded-[0.95rem] px-3 py-2 text-sm transition-all duration-150
                                                ${isSelected
                                                    ? 'bg-slate-100/80 text-slate-900 dark:bg-white/10 dark:text-white'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/5'
                                                }
                                            `}
                                        >
                                            <span className="flex items-center gap-2">
                                                {option.color && (
                                                    <span
                                                        className="w-2 h-2 rounded-full filter-option-color"
                                                        style={toStyleVars({ '--filter-option-color': option.color })}
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
                                                    <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />
                                                    </motion.div>
                                                )}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {multiSelect && hasSelection && (
                                <div className="border-t border-slate-200/50 p-2 dark:border-white/5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleClear(e);
                                            setIsOpen(false);
                                        }}
                                        className={ADMIN_HOVERABLE_BUTTON_CLASSES + ' w-full text-xs text-slate-600 dark:text-slate-300'}
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
