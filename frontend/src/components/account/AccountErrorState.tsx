import React from 'react';
import { RefreshCw } from 'lucide-react';
import {
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
  ACCOUNT_SECONDARY_ACTION_BUTTON_CLASSES,
} from '@/components/account/accountDesign';
import { Button } from '@/components/ui/button';

interface AccountErrorStateProps {
  isRetrying: boolean;
  onRetry: () => void;
}

const AccountErrorState: React.FC<AccountErrorStateProps> = ({ isRetrying, onRetry }) => (
  <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-5 sm:p-6`}>
    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          个人资料暂时无法同步
        </h2>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          仍可调整本地偏好，或稍后重新加载账号资料。
        </p>
      </div>
      <Button
        type="button"
        loading={isRetrying}
        onClick={onRetry}
        className={ACCOUNT_SECONDARY_ACTION_BUTTON_CLASSES}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        重新加载
      </Button>
    </div>
  </div>
);

export default AccountErrorState;
