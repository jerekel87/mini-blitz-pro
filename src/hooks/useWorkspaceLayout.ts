import { useCallback, useEffect, useState } from 'react';
import type { DockTab } from '../components/layout/WorkspaceDock';
import {
  getDockedTabsInZone,
  getFloatingTabs,
  isTabFloating,
} from '../lib/dockZones';
import {
  DEFAULT_WORKSPACE_LAYOUT,
  defaultFloatRect,
  floatRectFromRelease,
  type FloatReleasePoint,
  hasAnyPreviewLane,
  loadWorkspaceLayout,
  saveWorkspaceLayout,
  type DockZoneId,
  type FloatRect,
  type PreviewLaneVisibility,
  type WorkspaceLayoutState,
} from '../lib/workspaceLayout';

export function useWorkspaceLayout() {
  const [layout, setLayout] = useState<WorkspaceLayoutState>(loadWorkspaceLayout);

  useEffect(() => {
    saveWorkspaceLayout(layout);
  }, [layout]);

  const isFloating = useCallback(
    (tab: DockTab) => isTabFloating(layout.dock, tab),
    [layout.dock]
  );

  const getZone = useCallback(
    (tab: DockTab) => layout.dock[tab].zone,
    [layout.dock]
  );

  const getDockedInZone = useCallback(
    (zone: DockZoneId) => getDockedTabsInZone(layout.dock, zone),
    [layout.dock]
  );

  const floatTab = useCallback(
    (
      tab: DockTab,
      release?: FloatReleasePoint,
      presetRect?: FloatRect
    ) => {
      setLayout((prev) => {
        if (prev.dock[tab].mode === 'floating') return prev;
        const rect: FloatRect =
          presetRect ??
          (release
            ? floatRectFromRelease(tab, release)
            : defaultFloatRect(tab, getFloatingTabs(prev.dock).length));
        return {
          ...prev,
          dock: {
            ...prev.dock,
            [tab]: { mode: 'floating', zone: prev.dock[tab].zone, rect },
          },
        };
      });
    },
    []
  );

  const dockTabToZone = useCallback((tab: DockTab, zone: DockZoneId) => {
    setLayout((prev) => {
      const next = { ...prev.dock[tab] };
      const { rect: _r, ...rest } = next;
      let panels = prev.panels;
      if (zone === 'sidebar-below' && !panels.explorer) {
        panels = { ...panels, explorer: true };
      }
      if ((zone === 'preview-above' || zone === 'preview-below') && !panels.preview) {
        panels = { ...panels, preview: true };
      }
      return {
        ...prev,
        panels,
        dock: {
          ...prev.dock,
          [tab]: { ...rest, mode: 'docked', zone },
        },
      };
    });
  }, []);

  const dockTab = useCallback((tab: DockTab, zone?: DockZoneId) => {
    setLayout((prev) => {
      const targetZone = zone ?? prev.dock[tab].zone;
      const { rect: _r, ...rest } = prev.dock[tab];
      return {
        ...prev,
        dock: {
          ...prev.dock,
          [tab]: { ...rest, mode: 'docked', zone: targetZone },
        },
      };
    });
  }, []);

  const updateFloatRect = useCallback((tab: DockTab, rect: FloatRect) => {
    setLayout((prev) => {
      if (prev.dock[tab].mode !== 'floating') return prev;
      return {
        ...prev,
        dock: {
          ...prev.dock,
          [tab]: { ...prev.dock[tab], rect },
        },
      };
    });
  }, []);

  const setPreviewLanes = useCallback((patch: Partial<PreviewLaneVisibility>) => {
    setLayout((prev) => {
      const preview = { ...prev.preview, ...patch };
      const enableColumn = hasAnyPreviewLane(preview);
      return {
        ...prev,
        preview,
        panels: enableColumn ? { ...prev.panels, preview: true } : prev.panels,
      };
    });
  }, []);

  const setPanelVisible = useCallback(
    (panel: 'explorer' | 'preview' | 'parallelLab', visible: boolean) => {
      setLayout((prev) => ({
        ...prev,
        panels: { ...prev.panels, [panel]: visible },
      }));
    },
    []
  );

  const togglePanel = useCallback((panel: 'explorer' | 'preview') => {
    setLayout((prev) => {
      if (panel === 'preview') {
        const columnVisible = hasAnyPreviewLane(prev.preview) || prev.panels.preview;
        if (columnVisible) {
          return {
            ...prev,
            panels: { ...prev.panels, preview: false },
            preview: { instantA: false, instantB: false, truth: false },
          };
        }
        return {
          ...prev,
          panels: { ...prev.panels, preview: true },
          preview: { instantA: true, instantB: false, truth: true },
        };
      }
      return {
        ...prev,
        panels: { ...prev.panels, explorer: !prev.panels.explorer },
      };
    });
  }, []);

  const focusDockTab = useCallback((tab: DockTab, zone: DockZoneId = 'bottom') => {
    setLayout((prev) => {
      const placement = prev.dock[tab];
      let panels = prev.panels;
      if (zone === 'sidebar-below' && !panels.explorer) {
        panels = { ...panels, explorer: true };
      }
      if ((zone === 'preview-above' || zone === 'preview-below') && !panels.preview) {
        panels = { ...panels, preview: true };
      }
      if (placement.mode === 'docked' && placement.zone === zone) {
        return panels === prev.panels ? prev : { ...prev, panels };
      }
      const { rect: _r, ...rest } = placement;
      return {
        ...prev,
        panels,
        dock: {
          ...prev.dock,
          [tab]: { ...rest, mode: 'docked', zone },
        },
      };
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout({ ...DEFAULT_WORKSPACE_LAYOUT });
  }, []);

  return {
    layout,
    isFloating,
    getZone,
    getDockedInZone,
    floatTab,
    dockTab,
    dockTabToZone,
    updateFloatRect,
    setPreviewLanes,
    setPanelVisible,
    togglePanel,
    focusDockTab,
    resetLayout,
  };
}