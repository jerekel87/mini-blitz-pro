import type { DockTab } from '../components/layout/WorkspaceDock';
import type { DockZoneId } from './workspaceLayout';

export interface DockZonePanelSize {
  /** % of parent vertical (or horizontal) split */
  defaultSize: number;
  minSize: number;
  maxSize: number;
}

/** Compact splits per panel — avoids huge terminal / clipped Ask Jeremy. */
const TAB_SIZES: Record<DockTab, DockZonePanelSize> = {
  terminal: { defaultSize: 20, minSize: 14, maxSize: 28 },
  timeline: { defaultSize: 24, minSize: 16, maxSize: 32 },
  ai: { defaultSize: 36, minSize: 30, maxSize: 48 },
};

const EMPTY_DROP: DockZonePanelSize = { defaultSize: 0, minSize: 0, maxSize: 0 };

export function getDockZonePanelSize(
  dockedTabs: DockTab[],
  _zone: DockZoneId
): DockZonePanelSize {
  if (dockedTabs.length === 0) return EMPTY_DROP;

  if (dockedTabs.length === 1) {
    return { ...TAB_SIZES[dockedTabs[0]] };
  }

  return dockedTabs.reduce(
    (acc, tab) => {
      const s = TAB_SIZES[tab];
      return {
        defaultSize: Math.max(acc.defaultSize, s.defaultSize),
        minSize: Math.max(acc.minSize, s.minSize),
        maxSize: Math.max(acc.maxSize, s.maxSize),
      };
    },
    { ...TAB_SIZES[dockedTabs[0]] }
  );
}

/** Remaining % for editor / preview / explorer beside a dock strip. */
export function getCompanionPanelSize(dockedTabs: DockTab[], zone: DockZoneId): number {
  if (dockedTabs.length === 0) return 100;
  const dock = getDockZonePanelSize(dockedTabs, zone);
  return Math.max(36, 100 - dock.defaultSize);
}

export function getBottomDockSize(
  dockedTabs: DockTab[],
  fallbackDockPercent: number
): number {
  if (dockedTabs.length === 0) return 13;
  if (dockedTabs.length === 1) return getDockZonePanelSize(dockedTabs, 'bottom').defaultSize;
  return fallbackDockPercent;
}

/** Editor row % after reserving dock strips in the center column. */
export function getCenterEditorSize(
  editorAboveTabs: DockTab[],
  bottomTabs: DockTab[],
  allDockFloated: boolean,
  multiBottomFallback: number
): number {
  let used = 0;
  if (editorAboveTabs.length > 0) {
    used += getDockZonePanelSize(editorAboveTabs, 'editor-above').defaultSize;
  }
  if (bottomTabs.length > 0) {
    used += getBottomDockSize(bottomTabs, multiBottomFallback);
  } else if (allDockFloated) {
    used += 13;
  }
  if (used === 0) return 100;
  return Math.max(28, 100 - used);
}

/** Preview lab % when a dock strip shares the preview column. */
export function getPreviewMainSize(
  aboveTabs: DockTab[],
  belowTabs: DockTab[]
): number {
  let used = 0;
  if (aboveTabs.length > 0) used += getDockZonePanelSize(aboveTabs, 'preview-above').defaultSize;
  if (belowTabs.length > 0) used += getDockZonePanelSize(belowTabs, 'preview-below').defaultSize;
  if (used === 0) return 100;
  return Math.max(32, 100 - used);
}