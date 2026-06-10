import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DockTab } from '../components/layout/WorkspaceDock';
import type { DockZoneId } from '../lib/workspaceLayout';

export interface DockDragPreview {
  tab: DockTab;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DockMotionContextValue {
  draggingTab: DockTab | null;
  setDraggingTab: (tab: DockTab | null) => void;
  dockDrag: DockDragPreview | null;
  setDockDrag: (preview: DockDragPreview | null) => void;
  activeDropZone: DockZoneId | null;
  dropProximity: number;
  setDropTarget: (zone: DockZoneId | null, proximity?: number) => void;
}

const DockMotionContext = createContext<DockMotionContextValue | null>(null);

export function DockMotionProvider({ children }: { children: ReactNode }) {
  const [draggingTab, setDraggingTab] = useState<DockTab | null>(null);
  const [dockDrag, setDockDrag] = useState<DockDragPreview | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<DockZoneId | null>(null);
  const [dropProximity, setDropProximity] = useState(0);

  const setDropTarget = useCallback((zone: DockZoneId | null, proximity = 0) => {
    setActiveDropZone(zone);
    setDropProximity(proximity);
  }, []);

  const value = useMemo(
    () => ({
      draggingTab,
      setDraggingTab,
      dockDrag,
      setDockDrag,
      activeDropZone,
      dropProximity,
      setDropTarget,
    }),
    [draggingTab, dockDrag, activeDropZone, dropProximity, setDropTarget]
  );

  return <DockMotionContext.Provider value={value}>{children}</DockMotionContext.Provider>;
}

export function useDockMotion(): DockMotionContextValue {
  const ctx = useContext(DockMotionContext);
  if (!ctx) {
    throw new Error('useDockMotion must be used within DockMotionProvider');
  }
  return ctx;
}