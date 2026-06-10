import { useCallback, useEffect, useState } from 'react';
import { applyAccountAppearance } from '../lib/applyAccountAppearance';
import { estimateProjectStorageBytes } from '../lib/accountUsage';
import {
  loadUserAccount,
  resetUserAccount,
  saveUserAccount,
  type AccountPageId,
  type UserAccountState,
} from '../lib/userAccount';

export function useUserAccount() {
  const [account, setAccount] = useState<UserAccountState>(loadUserAccount);

  useEffect(() => {
    applyAccountAppearance(account.appearance);
  }, [account.appearance]);

  const persist = useCallback((updater: (prev: UserAccountState) => UserAccountState) => {
    setAccount((prev) => {
      const next = updater(prev);
      saveUserAccount(next);
      return next;
    });
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<UserAccountState['profile']>) => {
      persist((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
    },
    [persist]
  );

  const updateSettings = useCallback(
    (patch: Partial<UserAccountState['settings']>) => {
      persist((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    },
    [persist]
  );

  const updateAppearance = useCallback(
    (patch: Partial<UserAccountState['appearance']>) => {
      persist((prev) => ({ ...prev, appearance: { ...prev.appearance, ...patch } }));
    },
    [persist]
  );

  const updateNotifications = useCallback(
    (patch: Partial<UserAccountState['notifications']>) => {
      persist((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, ...patch },
      }));
    },
    [persist]
  );

  const updateSecurity = useCallback(
    (patch: Partial<UserAccountState['security']>) => {
      persist((prev) => ({ ...prev, security: { ...prev.security, ...patch } }));
    },
    [persist]
  );

  const updateBilling = useCallback(
    (patch: Partial<UserAccountState['billing']>) => {
      persist((prev) => ({ ...prev, billing: { ...prev.billing, ...patch } }));
    },
    [persist]
  );

  const recordAiPatch = useCallback(() => {
    persist((prev) => ({
      ...prev,
      usage: { ...prev.usage, aiPatchCount: prev.usage.aiPatchCount + 1 },
    }));
  }, [persist]);

  const tickWebContainerMinute = useCallback(() => {
    persist((prev) => ({
      ...prev,
      usage: {
        ...prev.usage,
        webContainerMinutes: prev.usage.webContainerMinutes + 1,
      },
    }));
  }, [persist]);

  const syncStorageUsage = useCallback((files: Record<string, string>) => {
    const bytes = estimateProjectStorageBytes(files);
    persist((prev) => ({
      ...prev,
      usage: { ...prev.usage, storageBytes: bytes },
    }));
  }, [persist]);

  const signOut = useCallback(() => {
    const next = resetUserAccount();
    setAccount(next);
    applyAccountAppearance(next.appearance);
    localStorage.removeItem('mini-blitz-ai-settings');
    localStorage.removeItem('grok-build-workspace-layout-v3');
    window.location.reload();
  }, []);

  const signOutOtherSessions = useCallback(() => {
    persist((prev) => ({
      ...prev,
      security: { ...prev.security, twoFactorEnabled: prev.security.twoFactorEnabled },
    }));
  }, [persist]);

  return {
    account,
    updateProfile,
    updateSettings,
    updateAppearance,
    updateNotifications,
    updateSecurity,
    updateBilling,
    recordAiPatch,
    tickWebContainerMinute,
    syncStorageUsage,
    signOut,
    signOutOtherSessions,
  };
}

export type { AccountPageId };