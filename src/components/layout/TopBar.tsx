import type { ReactNode } from 'react';
import {
  Play,
  RefreshCw,
  ExternalLink,
  Loader2,
  ChevronDown,
  Crosshair,
  Download,
  Rocket,
} from 'lucide-react';
import clsx from 'clsx';
import type { BootStatus, TemplateId } from '../../types';
import { TEMPLATES } from '../../lib/templates';
import { UserAvatar } from '../account/UserAvatar';

interface TopBarProps {
  status: BootStatus;
  templateId: TemplateId;
  previewUrl: string | null;
  onTemplateChange: (id: TemplateId) => void;
  onRestart: () => void;
  onOpenPreview: () => void;
  onExport?: () => void;
  onDeploy?: () => void;
  simpleModeHref?: string;
  workspaceMenu?: ReactNode;
  inspectMode?: boolean;
  onInspectModeChange?: (enabled: boolean) => void;
  inspectDisabled?: boolean;
  onAccountClick?: () => void;
  accountActive?: boolean;
  displayName?: string;
  avatarUrl?: string | null;
}

const STATUS: Record<BootStatus, { label: string; pill: string }> = {
  idle: { label: 'Idle', pill: 'status-pill-idle' },
  booting: { label: 'Booting', pill: 'status-pill-busy' },
  mounting: { label: 'Mounting', pill: 'status-pill-busy' },
  installing: { label: 'Installing', pill: 'status-pill-busy' },
  starting: { label: 'Starting', pill: 'status-pill-busy' },
  ready: { label: 'Ready', pill: 'status-pill-ready' },
  error: { label: 'Error', pill: 'status-pill-error' },
};

export function TopBar({
  status,
  templateId,
  previewUrl,
  onTemplateChange,
  onRestart,
  onOpenPreview,
  simpleModeHref = '../index.html',
  workspaceMenu,
  inspectMode = false,
  onInspectModeChange,
  inspectDisabled = false,
  onAccountClick,
  accountActive = false,
  displayName = 'You',
  avatarUrl,
}: TopBarProps) {
  const busy = ['booting', 'mounting', 'installing', 'starting'].includes(status);
  const st = STATUS[status];

  return (
    <header className="topbar-header relative z-[100] flex h-[var(--topbar-height)] shrink-0 items-center gap-2 border-b border-xai-border bg-xai-surface sm:gap-4">
      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
        <div className="rail-circle topbar-logo" aria-hidden>
          G
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-semibold tracking-tight text-xai-fg">Grok Build</p>
          <p className="truncate text-xs text-xai-muted">Cloud IDE · WebContainer</p>
        </div>
      </div>

      <div className="hidden h-7 w-px shrink-0 bg-xai-border sm:block" aria-hidden />

      <div className="input-select-wrap min-w-0 flex-1 sm:max-w-[260px]">
        <select
          value={templateId}
          onChange={(e) => onTemplateChange(e.target.value as TemplateId)}
          disabled={busy}
          className="input-field input-field-select py-1.5 pl-3 text-xs disabled:opacity-50"
          aria-label="Project template"
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="input-select-chevron" aria-hidden>
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
        <div className={clsx('status-pill topbar-status-mobile', st.pill)}>
          {busy ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <span className="status-pill-dot" aria-hidden />
          )}
          {st.label}
        </div>
        <button
          type="button"
          onClick={onRestart}
          disabled={busy}
          className="btn-ghost hidden sm:inline-flex"
          title="Restart dev server"
        >
          <RefreshCw className={clsx('h-4 w-4', busy && 'animate-spin')} />
          <span>Restart</span>
        </button>
        <button
          type="button"
          onClick={onOpenPreview}
          disabled={!previewUrl}
          className="btn-ghost"
          title="Open preview in new tab"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden md:inline">Preview</span>
        </button>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="btn-ghost"
            title="Export project as ZIP (clean file tree, no node_modules)"
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Export</span>
          </button>
        )}
        {onDeploy && (
          <button
            type="button"
            onClick={onDeploy}
            disabled={!previewUrl}
            className="btn-ghost"
            title="Deploy (hook for parent Bolt app, e.g. Vercel via DataSync)"
          >
            <Rocket className="h-4 w-4" />
            <span className="hidden md:inline">Deploy</span>
          </button>
        )}
        {onInspectModeChange && (
          <button
            type="button"
            onClick={() => onInspectModeChange(!inspectMode)}
            disabled={inspectDisabled}
            className={clsx(
              'btn-ghost',
              inspectMode && 'bg-xai-overlay text-xai-fg'
            )}
            title={
              inspectMode
                ? 'Inspect on — click preview elements to jump to code'
                : 'Inspect off — enable to click preview elements'
            }
            aria-pressed={inspectMode}
          >
            <Crosshair className="h-4 w-4" />
            <span className="hidden lg:inline">{inspectMode ? 'Inspect on' : 'Inspect'}</span>
          </button>
        )}
        <button type="button" onClick={onRestart} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
          <span className="hidden sm:inline">Run</span>
        </button>
        <a href={simpleModeHref} className="btn-ghost hidden lg:inline-flex text-xai-muted">
          Simple mode
        </a>

        {workspaceMenu}

        {onAccountClick && (
          <button
            type="button"
            onClick={onAccountClick}
            className={clsx('rail-btn shrink-0', accountActive && 'opacity-100')}
            title="Account settings"
            aria-label="Account settings"
            aria-current={accountActive ? 'page' : undefined}
          >
            <UserAvatar
              displayName={displayName}
              imageUrl={avatarUrl}
              size="sm"
              className={clsx(accountActive && 'ring-2 ring-xai-accent ring-offset-2 ring-offset-xai-surface')}
            />
          </button>
        )}

        <span className="topbar-actions-divider hidden sm:block" aria-hidden />

        <div className={clsx('status-pill hidden sm:inline-flex', st.pill)}>
          {busy ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <span className="status-pill-dot" aria-hidden />
          )}
          {st.label}
        </div>
      </div>
    </header>
  );
}