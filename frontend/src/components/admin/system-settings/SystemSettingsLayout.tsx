import React from 'react';
import { SystemSettingsSectionNav } from './SystemSettingsSectionNav';
import type { SystemSettingsSectionId } from './types';

interface SystemSettingsLayoutProps {
  activeSection: SystemSettingsSectionId;
  onSectionChange: (section: SystemSettingsSectionId) => void;
  children: React.ReactNode;
}

export const SystemSettingsLayout: React.FC<SystemSettingsLayoutProps> = ({
  activeSection,
  onSectionChange,
  children,
}) => (
  <div className="space-y-5">
    <div className="px-1">
      <SystemSettingsSectionNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />
    </div>
    <section className="min-w-0">{children}</section>
  </div>
);
