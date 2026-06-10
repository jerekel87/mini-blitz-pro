import type { DockTab } from '../components/layout/WorkspaceDock';
import type { DockTabPlacement, DockZoneId, WorkspaceLayoutState } from './workspaceLayout';

export const DOCK_TABS = ['timeline', 'terminal', 'ai'] as const;

export const DOCK_ZONE_ORDER: DockZoneId[] = [
  'sidebar-below',
  'editor-above',
  'bottom',
  'preview-above',
  'preview-below',
];

export const DOCK_ZONE_META: Record<
  DockZoneId,
  { label: string; shortLabel: string; description: string }
> = {
  'sidebar-below': {
    label: 'Below file explorer',
    shortLabel: 'Explorer stack',
    description: 'Dock under the file tree in the left column',
  },
  'editor-above': {
    label: 'Above editor',
    shortLabel: 'Above code',
    description: 'Dock above the code editor',
  },
  bottom: {
    label: 'Below editor',
    shortLabel: 'Bottom dock',
    description: 'Classic dock under the editor',
  },
  'preview-above': {
    label: 'Above preview',
    shortLabel: 'Above preview',
    description: 'Dock above the Parallel lab / preview column',
  },
  'preview-below': {
    label: 'Below preview',
    shortLabel: 'Below preview',
    description: 'Dock under the preview column',
  },
};

export interface DockZoneHit {
  zone: DockZoneId | null;
  inside: boolean;
  proximity: number;
}

export function getDockedTabsInZone(
  dock: WorkspaceLayoutState['dock'],
  zone: DockZoneId
): DockTab[] {
  return DOCK_TABS.filter((t) => dock[t].mode === 'docked' && dock[t].zone === zone);
}

export function getFloatingTabs(dock: WorkspaceLayoutState['dock']): DockTab[] {
  return DOCK_TABS.filter((t) => dock[t].mode === 'floating');
}

export function isTabFloating(dock: WorkspaceLayoutState['dock'], tab: DockTab): boolean {
  return dock[tab].mode === 'floating';
}

export function zoneHasDockedTabs(
  dock: WorkspaceLayoutState['dock'],
  zone: DockZoneId
): boolean {
  return getDockedTabsInZone(dock, zone).length > 0;
}

export { hitMeasuredDockZone as hitDockZone } from './dockDropGeometry';

export function getDockZoneRect(zone: DockZoneId): DOMRect | null {
  const el = document.querySelector<HTMLElement>(`[data-dock-zone="${zone}"]`);
  return el?.getBoundingClientRect() ?? null;
}

export function defaultPlacementForTab(_tab: DockTab): DockTabPlacement {
  return { mode: 'docked', zone: 'bottom' };
}