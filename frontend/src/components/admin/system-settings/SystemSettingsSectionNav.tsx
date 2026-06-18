import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs-6';
import {
  SYSTEM_SETTINGS_SECTIONS,
  type SystemSettingsSectionId,
} from './types';

interface SystemSettingsSectionNavProps {
  activeSection: SystemSettingsSectionId;
  onSectionChange: (section: SystemSettingsSectionId) => void;
}

export const SystemSettingsSectionNav: React.FC<SystemSettingsSectionNavProps> = ({
  activeSection,
  onSectionChange,
}) => (
  <Tabs
    value={activeSection}
    onValueChange={(value) => onSectionChange(value as SystemSettingsSectionId)}
    className="w-full"
  >
    <TabsList
      ariaLabel="系统设置分组"
      variant="pills"
      size="md"
      showHoverEffect
      showActiveIndicator={false}
      className="rounded-[1.25rem] border border-slate-200/70 bg-white/65 p-2 shadow-sm backdrop-blur-xl dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.52]"
      hoverIndicatorClassName="bg-blue-50 dark:bg-cyan-400/[0.08]"
    >
      {SYSTEM_SETTINGS_SECTIONS.map((section) => (
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
