import type { DockTab } from '../components/layout/WorkspaceDock';
import { DOCK_TABS, defaultPlacementForTab } from './dockZones';

export type { DockTab };
export type DockZoneId =
  | 'bottom'
  | 'sidebar-below'
  | 'editor-above'
  | 'preview-above'
  | 'preview-below';

export interface FloatRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DockTabPlacement {
  mode: 'docked' | 'floating';
  zone: DockZoneId;
  rect?: FloatRect;
}

export interface PreviewLaneVisibility {
  instantA: boolean;
  instantB: boolean;
  truth: boolean;
}

export interface WorkspaceLayoutState {
  dock: Record<DockTab, DockTabPlacement>;
  preview: PreviewLaneVisibility;
  panels: {
    explorer: boolean;
    preview: boolean;
    parallelLab: boolean;
  };
}

const STORAGE_KEY = 'grok-build-workspace-layout-v3';
const LEGACY_V2_KEY = 'grok-build-workspace-layout-v2';
const LEGACY_V1_KEY = 'grok-build-workspace-layout-v1';

export function hasAnyPreviewLane(preview: PreviewLaneVisibility): boolean {
  return preview.instantA || preview.instantB || preview.truth;
}

export function isPreviewColumnVisible(
  panels: WorkspaceLayoutState['panels'],
  preview: PreviewLaneVisibility
): boolean {
  return panels.preview || hasAnyPreviewLane(preview);
}

function defaultDock(): Record<DockTab, DockTabPlacement> {
  return {
    timeline: defaultPlacementForTab('timeline'),
    terminal: defaultPlacementForTab('terminal'),
    ai: defaultPlacementForTab('ai'),
  };
}

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayoutState = {
  dock: defaultDock(),
  preview: {
    instantA: true,
    instantB: true,
    truth: true,
  },
  panels: {
    explorer: true,
    preview: true,
    parallelLab: true,
  },
};

const FLOAT_MIN_W = 280;
const FLOAT_MIN_H = 220;

/** Compact floating windows when pulled out of the dock (not full dock strip width). */
export function defaultFloatSize(tab: DockTab): { width: number; height: number } {
  const narrow = typeof window !== 'undefined' && window.innerWidth <= 768;
  if (narrow) {
    return {
      width: Math.min(tab === 'ai' ? 360 : 340, window.innerWidth - 24),
      height: Math.min(tab === 'ai' ? 320 : 280, window.innerHeight * 0.45),
    };
  }
  return {
    width: tab === 'ai' ? 400 : 380,
    height: tab === 'ai' ? 380 : 340,
  };
}

export function clampFloatRect(rect: FloatRect): FloatRect {
  const maxW = window.innerWidth - 16;
  const maxH = window.innerHeight - 16;
  const width = Math.min(Math.max(FLOAT_MIN_W, rect.width), maxW);
  const height = Math.min(Math.max(FLOAT_MIN_H, rect.height), maxH);
  return {
    width,
    height,
    x: Math.max(8, Math.min(rect.x, window.innerWidth - width - 8)),
    y: Math.max(8, Math.min(rect.y, window.innerHeight - height - 8)),
  };
}

export function defaultFloatRect(tab: DockTab, index: number): FloatRect {
  const { width, height } = defaultFloatSize(tab);
  return clampFloatRect({
    x: 72 + index * 28,
    y: 88 + index * 32,
    width,
    height,
  });
}

export interface FloatReleasePoint {
  clientX: number;
  clientY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  sourceRect?: DOMRect;
}

/** Drop the floating panel under the cursor (top-left follows grab point). */
export function floatRectFromRelease(
  tab: DockTab,
  release: FloatReleasePoint
): FloatRect {
  const { width, height } = defaultFloatSize(tab);
  return clampFloatRect({
    x: release.clientX - release.grabOffsetX,
    y: release.clientY - release.grabOffsetY,
    width,
    height,
  });
}

function migrateLegacyFloating(
  floating: Partial<Record<DockTab, FloatRect>> | undefined
): Record<DockTab, DockTabPlacement> {
  const dock = defaultDock();
  if (!floating) return dock;
  for (const tab of DOCK_TABS) {
    const rect = floating[tab];
    if (rect) {
      dock[tab] = { mode: 'floating', zone: 'bottom', rect };
    }
  }
  return dock;
}

function parseStoredLayout(raw: string): WorkspaceLayoutState {
  const parsed = JSON.parse(raw) as Partial<WorkspaceLayoutState> & {
    floating?: Partial<Record<DockTab, FloatRect>>;
  };
  const panels = {
    ...DEFAULT_WORKSPACE_LAYOUT.panels,
    ...parsed.panels,
  };
  const dock = parsed.dock
    ? {
        ...defaultDock(),
        ...parsed.dock,
      }
    : migrateLegacyFloating(parsed.floating);

  return {
    dock,
    preview: { ...DEFAULT_WORKSPACE_LAYOUT.preview, ...parsed.preview },
    panels,
  };
}

export function loadWorkspaceLayout(): WorkspaceLayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parseStoredLayout(raw);
    for (const key of [LEGACY_V2_KEY, LEGACY_V1_KEY]) {
      const legacy = localStorage.getItem(key);
      if (legacy) {
        const migrated = parseStoredLayout(legacy);
        saveWorkspaceLayout(migrated);
        return migrated;
      }
    }
    return { ...DEFAULT_WORKSPACE_LAYOUT };
  } catch {
    return { ...DEFAULT_WORKSPACE_LAYOUT };
  }
}

export function saveWorkspaceLayout(state: WorkspaceLayoutState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}