import { useMemo, type RefObject } from 'react';
import { ExternalLink, RefreshCw, Zap, Server, MousePointerClick, Crosshair } from 'lucide-react';
import clsx from 'clsx';
import type { BootStatus } from '../types';
import { computeDualReality } from '../lib/dualReality';

interface DualPreviewProps {
  instantUrl: string | null;
  instantError: string | null;
  instantReady: boolean;
  instantUnsupported: string[];
  truthUrl: string | null;
  status: BootStatus;
  truthError: string | null;
  replayHint?: string | null;
  instantFrameRef?: RefObject<HTMLIFrameElement>;
  truthFrameRef?: RefObject<HTMLIFrameElement>;
  lastNavigate?: { file: string; line: number; lane?: string } | null;
  inspectMode?: boolean;
  onInspectModeChange?: (enabled: boolean) => void;
}

function LaneBadge({
  label,
  lane,
  state,
}: {
  label: string;
  lane: 'instant' | 'truth';
  state: 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        lane === 'instant' && 'bg-amber-500/15 text-amber-300',
        lane === 'truth' && 'bg-cyan-500/15 text-cyan-300',
        state === 'error' && 'bg-red-500/20 text-red-300',
        state === 'ready' && lane === 'instant' && 'bg-emerald-500/15 text-emerald-300',
        state === 'unsupported' && 'bg-orange-500/15 text-orange-300'
      )}
    >
      {lane === 'instant' ? <Zap className="h-3 w-3" /> : <Server className="h-3 w-3" />}
      {label}
    </span>
  );
}

function PreviewFrame({
  title,
  url,
  error,
  placeholder,
  busy,
  iframeRef,
}: {
  title: string;
  url: string | null;
  error: string | null;
  placeholder: string;
  busy?: boolean;
  iframeRef?: RefObject<HTMLIFrameElement>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col border-b border-blitz-border last:border-b-0">
      <div className="flex shrink-0 items-center justify-between border-b border-blitz-border/60 bg-blitz-elevated/50 px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-blitz-muted">
          {title}
        </span>
      </div>
      <div className="preview-frame-canvas relative min-h-0 flex-1">
        {error ? (
          <div className="preview-frame-error flex h-full flex-col justify-center gap-1 overflow-auto p-3 text-center">
            <p className="text-xs font-medium text-xai-warning">Instant lane limitation</p>
            <pre className="whitespace-pre-wrap text-left text-[10px] leading-relaxed opacity-90">
              {error}
            </pre>
          </div>
        ) : url ? (
          <iframe
            ref={iframeRef}
            title={title}
            src={url}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          />
        ) : (
          <div className="preview-frame-placeholder flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <RefreshCw className={clsx('h-6 w-6 text-xai-cyan', busy && 'animate-spin')} />
            <p className="text-xs text-xai-muted">{placeholder}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DualPreview({
  instantUrl,
  instantError,
  instantReady,
  instantUnsupported,
  truthUrl,
  status,
  truthError,
  replayHint,
  instantFrameRef,
  truthFrameRef,
  lastNavigate,
  inspectMode = false,
  onInspectModeChange,
}: DualPreviewProps) {
  const busy = ['booting', 'mounting', 'installing', 'starting'].includes(status);

  const reality = useMemo(
    () =>
      computeDualReality({
        instantError,
        instantReady,
        instantUnsupported,
        truthUrl,
        truthBootStatus: status,
        truthError,
      }),
    [instantError, instantReady, instantUnsupported, truthUrl, status, truthError]
  );

  const alignmentStyles: Record<string, string> = {
    aligned: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    'instant-ahead': 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    'truth-ahead': 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    diverged: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    'both-error': 'border-red-500/40 bg-red-500/10 text-red-300',
    waiting: 'border-blitz-border bg-blitz-elevated text-blitz-muted',
  };

  return (
    <div className="flex h-full flex-col bg-blitz-panel">
      <div className="panel-header flex-col !h-auto gap-2 !py-2">
        <div className="flex w-full items-center justify-between gap-2">
          <span>Dual reality</span>
          {truthUrl && (
            <a
              href={truthUrl}
              target="_blank"
              rel="noreferrer"
              className="icon-btn shrink-0"
              title="Open Truth preview in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onInspectModeChange?.(!inspectMode)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition',
              inspectMode
                ? 'border-sky-500/60 bg-sky-500/20 text-sky-200'
                : 'border-blitz-border bg-blitz-elevated text-blitz-muted hover:text-blitz-text'
            )}
            title={
              inspectMode
                ? 'Turn off to click buttons and test the app'
                : 'Turn on, then click any element in Instant or Truth preview to jump to its source'
            }
          >
            <Crosshair className="h-3 w-3 shrink-0" />
            {inspectMode ? 'Inspect on' : 'Inspect off'}
          </button>
          <p className="min-w-0 flex-1 text-[10px] text-blitz-muted">
            {inspectMode ? (
              <>
                <MousePointerClick className="mr-1 inline h-3 w-3 text-sky-400" />
                Click preview → editor. Turn off Inspect to test buttons.
              </>
            ) : (
              <>
                Normal clicks test the app.{' '}
                <span className="text-sky-300/90">Alt+click</span> (Mac: Option+click) or turn on Inspect.
              </>
            )}
          </p>
        </div>

        {lastNavigate && (
          <p className="w-full truncate font-mono text-[10px] text-sky-300">
            → {lastNavigate.file}:{lastNavigate.line}
            {lastNavigate.lane ? ` (${lastNavigate.lane})` : ''}
          </p>
        )}

        <div
          className={clsx(
            'w-full rounded-md border px-2 py-1.5 text-left',
            alignmentStyles[reality.alignment]
          )}
        >
          <p className="text-xs font-semibold">{reality.label}</p>
          <p className="mt-0.5 text-[10px] leading-snug opacity-90">
            {replayHint ?? reality.detail}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <LaneBadge label="Instant" lane="instant" state={reality.instantStatus} />
          <LaneBadge label="Truth" lane="truth" state={reality.truthStatus} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <PreviewFrame
          title="Instant — ~50ms bundler"
          url={instantUrl}
          error={instantError}
          placeholder="Bundling your files…"
          iframeRef={instantFrameRef}
        />
        <PreviewFrame
          title="Truth — WebContainer + Vite"
          url={truthUrl}
          error={status === 'error' ? truthError : null}
          placeholder={busy ? 'npm install & Vite dev server…' : 'Waiting for dev server…'}
          busy={busy}
          iframeRef={truthFrameRef}
        />
      </div>
    </div>
  );
}