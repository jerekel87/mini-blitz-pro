import type { LucideIcon } from 'lucide-react';
import {
  User,
  Settings,
  KeyRound,
  Palette,
  Bell,
  Shield,
  CreditCard,
  BarChart3,
} from 'lucide-react';

export type AccountPageId =
  | 'profile'
  | 'settings'
  | 'api-keys'
  | 'appearance'
  | 'notifications'
  | 'security'
  | 'billing'
  | 'usage';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  company: string;
  location: string;
  website: string;
}

export interface UserSettings {
  autoSave: boolean;
  formatOnSave: boolean;
  tabSize: 2 | 4;
  wordWrap: boolean;
  vimMode: boolean;
  defaultTemplate: string;
}

export interface UserAppearance {
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
}

export interface UserNotifications {
  emailDigest: boolean;
  buildFailures: boolean;
  aiPatchReady: boolean;
  productUpdates: boolean;
}

export interface UserSecurity {
  twoFactorEnabled: boolean;
  sessionTimeoutMins: 30 | 60 | 120 | 480;
  localPinSet: boolean;
}

export interface UserBilling {
  plan: 'free' | 'pro' | 'team';
  seats: number;
}

export interface UserUsage {
  webContainerMinutes: number;
  aiPatchCount: number;
  storageBytes: number;
  periodStartedAt: string;
}

export interface UserAccountState {
  profile: UserProfile;
  settings: UserSettings;
  appearance: UserAppearance;
  notifications: UserNotifications;
  security: UserSecurity;
  billing: UserBilling;
  usage: UserUsage;
}

const STORAGE_KEY = 'grok-build-user-account-v1';

const AVATAR_COLORS = [
  '#27272a',
  '#3f3f46',
  '#52525b',
  '#4f46e5',
  '#6366f1',
  '#7c3aed',
  '#0e7490',
  '#0d9488',
  '#b45309',
  '#9a3412',
];

const DEFAULT: UserAccountState = {
  profile: {
    id: 'local-user',
    displayName: 'Jeremy Ellsworth',
    email: 'you@example.com',
    username: 'jeremy',
    bio: '',
    avatarUrl: null,
    company: '',
    location: '',
    website: '',
  },
  settings: {
    autoSave: true,
    formatOnSave: false,
    tabSize: 2,
    wordWrap: true,
    vimMode: false,
    defaultTemplate: 'react-vite-tailwind',
  },
  appearance: {
    fontSize: 'medium',
    compactMode: false,
  },
  notifications: {
    emailDigest: true,
    buildFailures: true,
    aiPatchReady: true,
    productUpdates: false,
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeoutMins: 120,
    localPinSet: false,
  },
  billing: {
    plan: 'free',
    seats: 1,
  },
  usage: {
    webContainerMinutes: 0,
    aiPatchCount: 0,
    storageBytes: 0,
    periodStartedAt: new Date().toISOString(),
  },
};

/** First letter of first name + first letter of last name (e.g. Jeremy Ellsworth → JE). */
export function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) {
    const word = parts[0];
    return word.slice(0, 2).toUpperCase() || 'U';
  }
  const first = parts[0][0] ?? '';
  const last = parts[parts.length - 1][0] ?? '';
  return `${first}${last}`.toUpperCase();
}

export function getAvatarColor(displayName: string): string {
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function loadUserAccount(): UserAccountState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT, profile: { ...DEFAULT.profile } };
    const parsed = JSON.parse(raw) as Partial<UserAccountState>;
    return {
      profile: { ...DEFAULT.profile, ...parsed.profile },
      settings: { ...DEFAULT.settings, ...parsed.settings },
      appearance: {
        fontSize: parsed.appearance?.fontSize ?? DEFAULT.appearance.fontSize,
        compactMode: parsed.appearance?.compactMode ?? DEFAULT.appearance.compactMode,
      },
      notifications: { ...DEFAULT.notifications, ...parsed.notifications },
      security: { ...DEFAULT.security, ...parsed.security },
      billing: { ...DEFAULT.billing, ...parsed.billing },
      usage: { ...DEFAULT.usage, ...parsed.usage },
    };
  } catch {
    return { ...DEFAULT, profile: { ...DEFAULT.profile } };
  }
}

export function saveUserAccount(state: UserAccountState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetUserAccount(): UserAccountState {
  const next = {
    ...DEFAULT,
    profile: { ...DEFAULT.profile },
    usage: { ...DEFAULT.usage, periodStartedAt: new Date().toISOString() },
  };
  saveUserAccount(next);
  return next;
}

export function isValidDefaultTemplate(id: string): id is UserSettings['defaultTemplate'] {
  return (
    id === 'react-vite-tailwind' ||
    id === 'react-vite' ||
    id === 'vanilla-vite'
  );
}

export const ACCOUNT_PAGES: {
  id: AccountPageId;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { id: 'profile', label: 'Profile', description: 'Name, email, and public info', icon: User },
  { id: 'settings', label: 'Editor', description: 'Workspace and editor defaults', icon: Settings },
  { id: 'api-keys', label: 'API keys', description: 'Ask Jeremy and integrations', icon: KeyRound },
  { id: 'appearance', label: 'Appearance', description: 'Theme and display density', icon: Palette },
  { id: 'notifications', label: 'Notifications', description: 'Email and in-app alerts', icon: Bell },
  { id: 'security', label: 'Security', description: 'Password, 2FA, and sessions', icon: Shield },
  { id: 'billing', label: 'Billing', description: 'Plan and invoices', icon: CreditCard },
  { id: 'usage', label: 'Usage', description: 'Compute and AI quota', icon: BarChart3 },
];

/** Account rail sections — profile is always on the bottom rail control. */
export const ACCOUNT_NAV_PAGES = ACCOUNT_PAGES.filter((p) => p.id !== 'profile');