import React, { useState } from 'react';
import { ChannelPerformancePanel } from './ChannelPerformancePanel';
import { PerformanceSectionNav, type PerformanceSectionId } from './PerformanceSectionNav';
import { PluginPerformancePanel } from './PluginPerformancePanel';

export const PerformanceObservabilityView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<PerformanceSectionId>('plugin');

  return (
    <div className="space-y-5">
      <PerformanceSectionNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      {activeSection === 'plugin' ? <PluginPerformancePanel /> : <ChannelPerformancePanel />}
    </div>
  );
};

export default PerformanceObservabilityView;
