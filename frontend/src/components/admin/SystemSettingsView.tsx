import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Settings } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSystemSettingsController } from '@/hooks/useSystemSettingsController';
import { AccountAccessSettingsPanel } from './system-settings/AccountAccessSettingsPanel';
import { CacheSettingsPanel } from './system-settings/CacheSettingsPanel';
import { ExternalServicesSettingsPanel } from './system-settings/ExternalServicesSettingsPanel';
import { RuntimeSettingsPanel } from './system-settings/RuntimeSettingsPanel';
import { SearchExperienceSettingsPanel } from './system-settings/SearchExperienceSettingsPanel';
import { SiteDisplaySettingsPanel } from './system-settings/SiteDisplaySettingsPanel';
import { SystemSettingsLayout } from './system-settings/SystemSettingsLayout';
import {
  SYSTEM_SETTINGS_SECTIONS,
  type SystemSettingsSectionId,
} from './system-settings/types';

const resolveInitialSection = (): SystemSettingsSectionId => {
  if (typeof window === 'undefined') {
    return 'account';
  }

  const section = new URLSearchParams(window.location.search).get('section');
  const matchedSection = SYSTEM_SETTINGS_SECTIONS.find((item) => item.id === section);
  return matchedSection?.id ?? 'account';
};

export const SystemSettingsView: React.FC = () => {
  const { state, actions } = useSystemSettingsController();
  const [activeSection, setActiveSection] = React.useState<SystemSettingsSectionId>(resolveInitialSection);
  const [isTMDBTokenVisible, setIsTMDBTokenVisible] = React.useState(false);
  const [hasTMDBDraft, setHasTMDBDraft] = React.useState(false);
  const [isClearCacheDialogOpen, setIsClearCacheDialogOpen] = React.useState(false);

  const {
    enableUserAuth,
    enableUserLogin,
    enableUserSignup,
    enableResourceDetailPage,
    publicSiteUrl,
    tmdbReadAccessToken,
    tmdbCurrentTokenPreview,
    cacheSettings,
    runtimeSettings,
    isLoading,
    isSaving,
    isSavingTMDB,
    isSavingCache,
    isSavingRuntime,
    isTriggeringHotPreload,
    isClearingHotCache,
  } = state;

  React.useEffect(() => {
    if (!tmdbReadAccessToken) {
      setHasTMDBDraft(false);
    }
  }, [tmdbReadAccessToken]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="inline-block"
        >
          <RefreshCw className="h-10 w-10 text-blue-500" />
        </motion.div>
        <p className="mt-4 font-medium text-slate-500 dark:text-slate-400">加载设置中...</p>
      </div>
    );
  }

  const renderActivePanel = () => {
    switch (activeSection) {
      case 'account':
        return (
          <AccountAccessSettingsPanel
            enableUserAuth={enableUserAuth}
            enableUserLogin={enableUserLogin}
            enableUserSignup={enableUserSignup}
            isSaving={isSaving}
            onToggleAuth={actions.handleToggleAuth}
            onToggleLogin={actions.handleToggleLogin}
            onToggleSignup={actions.handleToggleSignup}
          />
        );
      case 'search':
        return (
          <SearchExperienceSettingsPanel
            enableResourceDetailPage={enableResourceDetailPage}
            runtimeSettings={runtimeSettings}
            isSaving={isSaving}
            isSavingRuntime={isSavingRuntime}
            onToggleResourceDetailPage={actions.handleToggleResourceDetailPage}
            onUpdateRuntimeField={actions.updateRuntimeField}
            onSaveRuntimeSettings={actions.handleSaveRuntimeSettings}
          />
        );
      case 'runtime':
        return (
          <RuntimeSettingsPanel
            runtimeSettings={runtimeSettings}
            isSavingRuntime={isSavingRuntime}
            onUpdateRuntimeField={actions.updateRuntimeField}
            onSaveRuntimeSettings={actions.handleSaveRuntimeSettings}
          />
        );
      case 'cache':
        return (
          <CacheSettingsPanel
            cacheSettings={cacheSettings}
            isSavingCache={isSavingCache}
            isTriggeringHotPreload={isTriggeringHotPreload}
            isClearingHotCache={isClearingHotCache}
            onUpdateCacheField={actions.updateCacheField}
            onSaveCacheSettings={actions.handleSaveCacheSettings}
            onTriggerHotRankingPreload={actions.handleTriggerHotRankingPreload}
            onClearHotRankingCacheClick={() => setIsClearCacheDialogOpen(true)}
          />
        );
      case 'external':
        return (
          <ExternalServicesSettingsPanel
            tmdbReadAccessToken={tmdbReadAccessToken}
            tmdbCurrentTokenPreview={tmdbCurrentTokenPreview}
            isSavingTMDB={isSavingTMDB}
            isTMDBTokenVisible={isTMDBTokenVisible}
            hasTMDBDraft={hasTMDBDraft}
            onTMDBTokenVisibleChange={setIsTMDBTokenVisible}
            onTMDBDraftChange={setHasTMDBDraft}
            onTMDBReadAccessTokenChange={actions.setTMDBReadAccessToken}
            onSaveTMDBConfig={actions.handleSaveTMDBConfig}
          />
        );
      case 'display':
        return (
          <SiteDisplaySettingsPanel
            publicSiteUrl={publicSiteUrl}
            isSaving={isSaving}
            onPublicSiteUrlChange={actions.setPublicSiteUrl}
            onSaveDisplayConfig={actions.handleSaveDisplayConfig}
          />
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-6xl space-y-8 pb-12"
    >
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            系统设置
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            按场景管理账号、搜索体验、运行参数、缓存预热和外部服务
          </p>
        </div>
      </div>

      <SystemSettingsLayout
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        {renderActivePanel()}
      </SystemSettingsLayout>

      <ConfirmDialog
        open={isClearCacheDialogOpen}
        onOpenChange={setIsClearCacheDialogOpen}
        title="确认清理热门榜单缓存"
        description="该操作会立即删除 Redis 中的热门榜单缓存，下一次访问会重新回源并重建缓存。"
        confirmText="立即清理"
        variant="destructive"
        isLoading={isClearingHotCache}
        onConfirm={() => {
          void actions.handleClearHotRankingCache();
          setIsClearCacheDialogOpen(false);
        }}
      />
    </motion.div>
  );
};
