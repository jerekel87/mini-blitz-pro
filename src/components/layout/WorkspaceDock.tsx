import { useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import { DockDragDots } from './DockDragDots';
import { useDockMotion } from '../../context/DockMotionContext';
import type { FloatReleasePoint } from '../../lib/workspaceLayout';
import type { DockZoneId } from '../../lib/workspaceLayout';
import { useDockPullDrag } from './useDockPullDrag';

export type DockTab = 'terminal' | 'timeline' | 'ai' | 'packages' | 'env' | 'problems' | 'search';

interface WorkspaceDockProps {
  zone: DockZoneId;
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
  dockedTabs: DockTab[];
  allTabsFloating: boolean;
  terminal: ReactNode;
  timeline: ReactNode;
  ai: ReactNode;
  packages: ReactNode;
  env: ReactNode;
  problems: ReactNode;
  search: ReactNode;
  problemsCount?: number;
  onFloatTab: (tab: DockTab, release: FloatReleasePoint) => void;
  onDockTabToZone: (tab: DockTab, zone: DockZoneId) => void;
}

const TABS: { id: DockTab; label: string }[] = [
  { id: 'timeline', label: 'Session' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'ai', label: 'Ask Jeremy' },
  { id: 'packages', label: 'Packages' },
  { id: 'env', label: 'Env' },
  { id: 'problems', label: 'Problems' },
  { id: 'search', label: 'Search' },
];

function DockTabCell({
  tab,
  label,
  isActive,
  zone,
  onSelect,
  getPanelRect,
  onFloat,
  onDockTabToZone,
  badge,
}: {
  tab: DockTab;
  label: string;
  isActive: boolean;
  zone: DockZoneId;
  onSelect: () => void;
  getPanelRect: () => DOMRect | undefined;
  onFloat: (release: FloatReleasePoint) => void;
  onDockTabToZone: (tab: DockTab, zone: DockZoneId) => void;
  badge?: number;
}) {
  const cellRef = useRef<HTMLDivElement>(null);
  const drag = useDockPullDrag(
    tab,
    label,
    {
      getGrabRect: () => cellRef.current?.getBoundingClientRect(),
      getPanelRect,
    },
    onFloat,
    (z) => {
      if (z !== zone) onDockTabToZone(tab, z);
    },
    onSelect
  );

  return (
    <div
      ref={cellRef}
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      aria-label={label}
      title={`${label} — click to focus, hold or drag to move`}
      className={clsx(
        'dock-tab-cell',
        tab === 'ai' && 'dock-tab-cell--wide',
        isActive && 'dock-tab-cell-active',
        drag.pulling && 'dock-tab-cell-dragging'
      )}
      onPointerDown={drag.onPointerDown}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <DockDragDots className="dock-tab-cell-grip shrink-0" />
      <span className="dock-tab-label">{label}</span>
      {badge && badge > 0 && (
        <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[9px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
  );
}

function DockSoloHeader({
  tab,
  label,
  zone,
  getPanelRect,
  onFloat,
  onDockTabToZone,
}: {
  tab: DockTab;
  label: string;
  zone: DockZoneId;
  getPanelRect: () => DOMRect | undefined;
  onFloat: (release: FloatReleasePoint) => void;
  onDockTabToZone: (tab: DockTab, zone: DockZoneId) => void;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const drag = useDockPullDrag(
    tab,
    label,
    {
      getGrabRect: () => headerRef.current?.getBoundingClientRect(),
      getPanelRect,
    },
    onFloat,
    (z) => {
      if (z !== zone) onDockTabToZone(tab, z);
    }
  );

  return (
    <div
      ref={headerRef}
      className={clsx(
        'dock-solo-header shrink-0',
        drag.pulling && 'dock-solo-header-dragging'
      )}
      onPointerDown={drag.onPointerDown}
      role="toolbar"
      aria-label={`${label} panel`}
    >
      <DockDragDots className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-xai-fg">{label}</span>
    </div>
  );
}

function DockEmptyState({ allTabsFloating }: { allTabsFloating: boolean }) {
  return (
    <div className="dock-drop-prompt dock-drop-prompt-all flex flex-col items-center justify-center gap-2 px-6 text-center">
      <DockDragDots className="dock-drag-dots--muted scale-125" />
      <p className="text-sm font-medium text-xai-secondary">
        {allTabsFloating ? 'Dock empty' : 'No panels docked here'}
      </p>
      <p className="max-w-sm text-xs leading-relaxed text-xai-muted">
        {allTabsFloating
          ? 'Drag a panel by its tab, or drop a floating window on a highlighted region.'
          : 'Drag a panel here — click a tab to focus; hold or drag the tab to move.'}
      </p>
    </div>
  );
}

export function WorkspaceDock({
  zone,
  activeTab,
  onTabChange,
  dockedTabs,
  allTabsFloating,
  terminal,
  timeline,
  ai,
  packages,
  env,
  problems,
  search,
  problemsCount = 0,
  onFloatTab,
  onDockTabToZone,
}: WorkspaceDockProps) {
  const motion = useDockMotion();
  const dockRootRef = useRef<HTMLDivElement>(null);
  const zoneTabs = TABS.filter((t) => dockedTabs.includes(t.id));
  const soloMode = zoneTabs.length === 1;
  const multiMode = zoneTabs.length > 1;
  const activeInZone = zoneTabs.some((t) => t.id === activeTab)
    ? activeTab
    : (zoneTabs[0]?.id ?? activeTab);
  const soloMeta = zoneTabs[0];

  const contentByTab: Record<DockTab, ReactNode> = {
    timeline,
    terminal,
    ai,
    packages,
    env,
    problems,
    search,
  };

  const dropActive = motion.activeDropZone === zone;
  const dropNear = motion.dropProximity > 0.15 && motion.activeDropZone !== zone;
  const isLifting = motion.dockDrag?.tab != null && dockedTabs.includes(motion.dockDrag.tab);

  const getPanelRect = () =>
    dockRootRef.current
      ?.querySelector<HTMLElement>('.dock-panel-content, .dock-panel-body')
      ?.getBoundingClientRect();

  const makeFloatHandler = (tab: DockTab) => (release: FloatReleasePoint) => onFloatTab(tab, release);

  return (
    <div
      ref={dockRootRef}
      className={clsx(
        'workspace-dock flex h-full min-h-0 flex-col',
        soloMode && 'workspace-dock--solo',
        multiMode && 'workspace-dock--multi',
        zone === 'bottom' && allTabsFloating && 'workspace-dock--all-floating'
      )}
      data-dock-zone={zone}
    >
      {soloMode && soloMeta && (
        <DockSoloHeader
          tab={soloMeta.id}
          label={soloMeta.label}
          zone={zone}
          getPanelRect={getPanelRect}
          onFloat={makeFloatHandler(soloMeta.id)}
          onDockTabToZone={onDockTabToZone}
        />
      )}

      {multiMode && (
        <div className="dock-tab-row shrink-0 border-b border-xai-border-subtle bg-xai-surface">
          {zoneTabs.map(({ id, label }) => {
            const badge = id === 'problems' && problemsCount > 0 ? problemsCount : undefined;
            return (
              <DockTabCell
                key={id}
                tab={id}
                label={label}
                zone={zone}
                isActive={activeInZone === id}
                getPanelRect={getPanelRect}
                onSelect={() => onTabChange(id)}
                onFloat={makeFloatHandler(id)}
                onDockTabToZone={onDockTabToZone}
                badge={badge}
              />
            );
          })}
        </div>
      )}

      <div
        className={clsx(
          'dock-panel-body min-h-0 flex-1 flex flex-col',
          dropActive && 'dock-panel-body--drop-active',
          dropNear && 'dock-panel-body--drop-near'
        )}
      >
        {zoneTabs.length === 0 ? (
          <DockEmptyState allTabsFloating={allTabsFloating && zone === 'bottom'} />
        ) : (
          <div
            className={clsx(
              'dock-panel-content dock-panel-docked relative min-h-0 min-w-0 flex-1',
              isLifting && 'dock-panel-content--lifting'
            )}
          >
            {zoneTabs.map(({ id }) => (
              <div
                key={id}
                className={clsx(
                  'absolute inset-0 flex min-h-0 min-w-0 flex-col',
                  activeInZone !== id && 'pointer-events-none invisible'
                )}
                aria-hidden={activeInZone !== id}
              >
                {contentByTab[id]}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}