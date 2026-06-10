import { Files, FlaskConical, Terminal, History, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { UserAvatar } from '../account/UserAvatar';
import type { DockTab } from './WorkspaceDock';

export type RailAction = 'explorer' | 'lab' | 'terminal' | 'session' | 'ask';

interface ActivityRailProps {
  explorerOpen: boolean;
  labOpen: boolean;
  dockFocus: DockTab | null;
  onExplorer: () => void;
  onLab: () => void;
  onTerminal: () => void;
  onSession: () => void;
  onAsk: () => void;
  terminalBadge?: boolean;
  accountActive?: boolean;
  onAccountClick: () => void;
  displayName: string;
  avatarUrl?: string | null;
}

const ITEMS: {
  id: RailAction;
  label: string;
  hint: string;
  icon: typeof Files;
  dockTab?: DockTab;
}[] = [
  {
    id: 'explorer',
    label: 'Explorer',
    hint: 'Show or hide the file tree',
    icon: Files,
  },
  {
    id: 'lab',
    label: 'Parallel lab',
    hint: 'Show or hide the preview column',
    icon: FlaskConical,
  },
  {
    id: 'terminal',
    label: 'Terminal',
    hint: 'Focus the terminal panel',
    icon: Terminal,
    dockTab: 'terminal',
  },
  {
    id: 'session',
    label: 'Session',
    hint: 'Focus session timeline',
    icon: History,
    dockTab: 'timeline',
  },
  {
    id: 'ask',
    label: 'Ask Jeremy',
    hint: 'Focus AI assistant',
    icon: Sparkles,
    dockTab: 'ai',
  },
];

export function ActivityRail({
  explorerOpen,
  labOpen,
  dockFocus,
  onExplorer,
  onLab,
  onTerminal,
  onSession,
  onAsk,
  terminalBadge,
  accountActive = false,
  onAccountClick,
  displayName,
  avatarUrl,
}: ActivityRailProps) {
  const handlers: Record<RailAction, () => void> = {
    explorer: onExplorer,
    lab: onLab,
    terminal: onTerminal,
    session: onSession,
    ask: onAsk,
  };

  const isPressed = (id: RailAction, dockTab?: DockTab) => {
    if (accountActive) return false;
    if (id === 'explorer') return explorerOpen;
    if (id === 'lab') return labOpen;
    if (dockTab) return dockFocus === dockTab;
    return false;
  };

  return (
    <nav
      className="activity-rail flex w-[var(--rail-width)] shrink-0 flex-col border-r border-xai-border-subtle bg-xai-surface"
      aria-label="Workspace shortcuts"
    >
      <div className="flex flex-1 flex-col items-center gap-1 py-4">
        {ITEMS.map(({ id, label, hint, icon: Icon, dockTab }) => {
          const pressed = isPressed(id, dockTab);
          return (
            <button
              key={id}
              type="button"
              onClick={handlers[id]}
              className="rail-btn"
              aria-label={label}
              title={hint}
              aria-pressed={pressed}
            >
              <span
                className={clsx('rail-circle rail-btn-circle', pressed && 'rail-btn-circle-active')}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                {id === 'terminal' && terminalBadge && <span className="rail-btn-badge" aria-hidden />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2 border-t border-xai-border-subtle py-3">
        <button
          type="button"
          onClick={onAccountClick}
          className="rail-btn"
          aria-label="Account settings"
          title="Account settings"
          aria-pressed={accountActive}
        >
          <span
            className={clsx(
              'rail-circle rail-btn-circle overflow-hidden p-0',
              accountActive && 'rail-btn-circle-active',
            )}
          >
            <UserAvatar
              displayName={displayName}
              size="md"
              imageUrl={avatarUrl}
              className="!h-full !w-full !text-[0.6875rem]"
            />
          </span>
        </button>
      </div>
    </nav>
  );
}