import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs-6';

export type PerformanceSectionId = 'plugin' | 'channel';

const PERFORMANCE_SECTIONS: Array<{ id: PerformanceSectionId; label: string }> = [
  { id: 'plugin', label: '插件监控' },
  { id: 'channel', label: '频道监控' },
];

interface PerformanceSectionNavProps {
  activeSection: PerformanceSectionId;
  onSectionChange: (section: PerformanceSectionId) => void;
}

export const PerformanceSectionNav: React.FC<PerformanceSectionNavProps> = ({
  activeSection,
  onSectionChange,
}) => (
  <Tabs
    value={activeSection}
    onValueChange={(value) => onSectionChange(value as PerformanceSectionId)}
    className="w-full"
  >
    <TabsList
      ariaLabel="性能监控分组"
      variant="pills"
      size="md"
      showHoverEffect
      showActiveIndicator={false}
      className="rounded-[1.25rem] border border-slate-200/70 bg-white/65 p-2 shadow-sm backdrop-blur-xl dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.52]"
      hoverIndicatorClassName="bg-blue-50 dark:bg-cyan-400/[0.08]"
    >
      {PERFORMANCE_SECTIONS.map((section) => (
        <TabsTrigger
          key={section.id}
          value={section.id}
          activeClassName="text-blue-700 dark:text-cyan-100"
          inactiveClassName="text-slate-600 dark:text-slate-300"
          className="rounded-full px-4 py-2 text-sm font-semibold"
        >
          {section.label}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);
