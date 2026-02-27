import React from 'react';
import { cn } from '@/lib/utils';

export interface AuthCardShellProps {
  glowClassName: string;
  className?: string;
  children: React.ReactNode;
}

const AuthCardShell: React.FC<AuthCardShellProps> = ({ glowClassName, className, children }) => {
  return (
    <div className={cn('relative z-10 w-full max-w-md', className)}>
      <div className={cn('auth-card-glow', glowClassName)} />
      {children}
    </div>
  );
};

export default AuthCardShell;
