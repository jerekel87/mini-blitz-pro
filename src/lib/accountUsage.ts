import type { UserUsage } from './userAccount';

export const USAGE_CAPS = {
  webContainerMinutes: 600,
  aiPatches: 50,
  storageBytes: 500 * 1024 * 1024,
} as const;

export function formatUsageValue(
  key: keyof typeof USAGE_CAPS,
  usage: UserUsage
): { value: string; cap: string } {
  switch (key) {
    case 'webContainerMinutes': {
      const h = Math.floor(usage.webContainerMinutes / 60);
      const m = Math.round(usage.webContainerMinutes % 60);
      const value = h > 0 ? `${h}h ${m}m` : `${m}m`;
      const capH = Math.floor(USAGE_CAPS.webContainerMinutes / 60);
      return { value, cap: `${capH}h` };
    }
    case 'aiPatches':
      return { value: String(usage.aiPatchCount), cap: String(USAGE_CAPS.aiPatches) };
    case 'storageBytes': {
      const mb = usage.storageBytes / (1024 * 1024);
      const capMb = USAGE_CAPS.storageBytes / (1024 * 1024);
      return {
        value: mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(usage.storageBytes / 1024)} KB`,
        cap: `${capMb} MB`,
      };
    }
    default:
      return { value: '0', cap: '0' };
  }
}

export function estimateProjectStorageBytes(files: Record<string, string>): number {
  try {
    return new Blob([JSON.stringify(files)]).size;
  } catch {
    return 0;
  }
}