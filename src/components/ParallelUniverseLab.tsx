import { useMemo, type RefObject } from 'react';
import {
  ExternalLink,
  RefreshCw,
  GitBranch,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import type { BootStatus } from '../types';
import { computeDualReality } from '../lib/dualReality';
import {
  UNIVERSE_PRESETS,
  universeLabel,
  type UniverseId,
  type UniversePresetId,
} from '../lib/parallelUniverse';
import type { PreviewLaneVisibility } from '../lib/workspaceLayout';

interface ParallelUniverseLabProps {
  activeUniverse: UniverseId;
  hasB: boolean;
  divergedPaths: string[];
  switching?: boolean;
  onSelectUniverse: (id: UniverseId) => void;
  onForkB: () => void;
  onResetB: () => void;
  onPromoteB: () => void;
  onApplyPreset: (preset: UniversePresetId) => void;
  instantAUrl: string | null;
  instantAError: string | null;
  instantAReady: boolean;
  instantAUnsupported: string[];
  instantBUrl: string | null;
  instantBError: string | null;
  instantBReady: boolean;
  instantBUnsupported: string[];
  truthUrl: string | null;
  status: BootStatus;
  truthError: string | null;
  replayHint?: string | null;
  instantAFrameRef?: RefObject<HTMLIFrameElement>;
  instantBFrameRef?: RefObject<HTMLIFrameElement>;
  truthFrameRef?: RefObject<HTMLIFrameElement>;
  lastNavigate?: { file: string; line: number; lane?: string } | null;
  disabled?: boolean;
  previewLanes?: PreviewLaneVisibility;
  showParallelLab?: boolean;
}

function PreviewFrame({
  title,
  subtitle,
  url,
  error,
  placeholder,
  busy,
  iframeRef,
  accent,
  limitations,
}: {
  title: string;
  subtitle: string;
  url: string | null;
  error: string | null;
  placeholder: string;
  busy?: boolean;
  iframeRef?: RefObject<HTMLIFrameElement>;
  accent?: 'amber' | 'violet' | 'cyan';
  /** Shown when preview runs in simplified mode (e.g. no Tailwind in Instant lane). */
  limitations?: string[];
}) {
  const accentBorder =
    accent === 'violet'
      ? 'border-violet-500/25'
      : accent === 'cyan'
        ? 'border-cyan-500/25'
        : 'border-amber-500/20';

  return (
    <div className={clsx('flex min-h-0 flex-1 flex-col border', accentBorder)}>
      <div className="flex shrink-0 flex-col gap-0.5 border-b border-xai-border-subtle bg-xai-raised px-3 py-2.5">
        <span className="text-xs font-medium text-xai-fg">{title}</span>
        <span className="text-2xs text-xai-muted">{subtitle}</span>
      </div>
      <div className="preview-frame-canvas relative min-h-0 flex-1">
        {error ? (
          <div className="preview-frame-error flex h-full flex-col justify-center gap-2 overflow-auto p-4 text-center">
            <p className="text-xs font-medium text-xai-warning">Instant lane limitation</p>
            <pre className="whitespace-pre-wrap text-left text-[10px] leading-relaxed opacity-90">
              {error}
            </pre>
          </div>
        ) : url ? (
          <>
            <iframe
              ref={iframeRef}
              title={title}
              src={url}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
            {limitations && limitations.length > 0 && (
              <p className="preview-lane-limitation absolute bottom-0 left-0 right-0 border-t px-3 py-2 text-2xs leading-relaxed">
                Simplified preview — full styling and Tailwind run in the Truth panel below.
              </p>
            )}
          </>
        ) : (
          <div className="preview-frame-placeholder flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <RefreshCw className={clsx('h-6 w-6 text-xai-cyan', busy && 'animate-spin')} />
            <p className="text-xs">{placeholder}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ParallelUniverseLab({
  activeUniverse,
  hasB,
  divergedPaths,
  switching,
  onSelectUniverse,
  onForkB,
  onResetB,
  onPromoteB,
  onApplyPreset,
  instantAUrl,
  instantAError,
  instantAReady,
  instantAUnsupported,
  instantBUrl,
  instantBError,
  instantBReady,
  instantBUnsupported,
  truthUrl,
  status,
  truthError,
  replayHint,
  instantAFrameRef,
  instantBFrameRef,
  truthFrameRef,
  lastNavigate,
  disabled = false,
  previewLanes = { instantA: true, instantB: true, truth: true },
  showParallelLab = true,
}: ParallelUniverseLabProps) {
  const busy = ['booting', 'mounting', 'installing', 'starting'].includes(status) || switching;
  const showInstantA = previewLanes.instantA;
  const showInstantB = previewLanes.instantB;
  const showTruth = previewLanes.truth;
  const showInstantRow = showInstantA || showInstantB;

  const reality = useMemo(
    () =>
      computeDualReality({
        instantError: activeUniverse === 'b' ? instantBError : instantAError,
        instantReady: activeUniverse === 'b' ? instantBReady : instantAReady,
        instantUnsupported: activeUniverse === 'b' ? instantBUnsupported : instantAUnsupported,
        truthUrl,
        truthBootStatus: status,
        truthError,
      }),
    [
      activeUniverse,
      instantAError,
      instantAReady,
      instantAUnsupported,
      instantBError,
      instantBReady,
      instantBUnsupported,
      truthUrl,
      status,
      truthError,
    ]
  );

  const alignmentStyles: Record<string, string> = {
    aligned: 'lab-align-aligned',
    'instant-ahead': 'lab-align-instant-ahead',
    'truth-ahead': 'lab-align-truth-ahead',
    diverged: 'lab-align-diverged',
    'both-error': 'lab-align-both-error',
    waiting: 'lab-align-waiting',
  };

  return (
    <div className="lab-panel">
      <div className="lab-section">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {showParallelLab ? (
              <GitBranch className="h-4 w-4 text-xai-violet" strokeWidth={1.5} />
            ) : null}
            <span className="text-sm font-semibold tracking-tight text-xai-fg">
              {showParallelLab ? 'Parallel lab' : 'Preview'}
            </span>
          </div>
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
        {showParallelLab ? (
          <p className="mt-2 text-xs leading-relaxed text-xai-muted">
            Compare two code universes. <strong className="font-medium text-xai-secondary">Instant</strong>{' '}
            previews bundle in-browser; <strong className="font-medium text-xai-secondary">Truth</strong>{' '}
            runs the active universe in WebContainer + Vite.
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-xai-muted">
            Live previews for your project. Turn lanes on or off in Workspace.
          </p>
        )}
      </div>

      {showParallelLab && (
      <div className="lab-section space-y-3">
        <p className="lab-section-title">Active universe</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="lab-segmented" role="group" aria-label="Select universe">
            {(['a', 'b'] as const).map((id) => (
              <button
                key={id}
                type="button"
                disabled={disabled || (id === 'b' && !hasB) || switching}
                onClick={() => onSelectUniverse(id)}
                className={clsx(
                  'lab-segment',
                  id === 'a' && 'lab-segment-a',
                  id === 'b' && 'lab-segment-b',
                  activeUniverse === id && 'lab-segment-active',
                  id === 'b' && !hasB && 'cursor-not-allowed opacity-40'
                )}
              >
                {universeLabel(id)}
                {id === 'b' && !hasB ? ' · fork to enable' : ''}
              </button>
            ))}
          </div>

          {!hasB ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onForkB}
              className="lab-chip lab-chip-primary"
            >
              Fork Universe B
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={disabled || switching}
                onClick={onResetB}
                className="lab-chip"
                title="Reset B to match A"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset B
              </button>
              <button
                type="button"
                disabled={disabled || switching}
                onClick={onPromoteB}
                className="lab-chip lab-chip-violet"
                title="Replace A with B and sync Truth"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Promote B → A
              </button>
            </>
          )}
        </div>
        <p className="text-xs text-xai-muted">
          Editing <span className="font-medium text-xai-fg">{universeLabel(activeUniverse)}</span>{' '}
          in the editor. Truth preview follows the active universe.
        </p>
      </div>
      )}

      {showParallelLab && hasB && (
        <div className="lab-section space-y-2">
          <p className="lab-section-title">Universe B presets</p>
          <div className="flex flex-wrap gap-2">
            {UNIVERSE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onApplyPreset(p.id)}
                className="lab-chip"
                title={p.detail}
              >
                {p.label}
              </button>
            ))}
          </div>
          {divergedPaths.length > 0 && (
            <p className="font-mono text-2xs text-violet-300/90">
              {divergedPaths.length} file{divergedPaths.length !== 1 ? 's' : ''} differ from A:{' '}
              {divergedPaths.slice(0, 3).join(', ')}
              {divergedPaths.length > 3 ? '…' : ''}
            </p>
          )}
        </div>
      )}

      {showParallelLab && (
      <div className="lab-section">
        <div className={clsx('lab-status-banner', alignmentStyles[reality.alignment])}>
          <p className="text-xs font-semibold">{reality.label}</p>
          <p className="mt-1 text-2xs leading-relaxed opacity-90">
            {replayHint ?? reality.detail}
          </p>
          {lastNavigate && (
            <p className="mt-2 font-mono text-2xs text-sky-300/90">
              Last jump → {lastNavigate.file}:{lastNavigate.line}
              {lastNavigate.lane ? ` (${lastNavigate.lane})` : ''}
            </p>
          )}
        </div>
      </div>
      )}

      <div className="lab-preview-stack flex min-h-0 flex-1 flex-col">
        {!showInstantRow && !showTruth ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 border-t border-xai-border-subtle px-6 text-center">
            <p className="text-sm font-medium text-xai-secondary">Preview lanes hidden</p>
            <p className="max-w-sm text-xs leading-relaxed text-xai-muted">
              Open <strong className="font-medium text-xai-secondary">Workspace</strong> in the top bar
              to turn Universe A, B, or Truth back on.
            </p>
          </div>
        ) : (
          <>
            {showInstantRow && (
              <div
                className={clsx(
                  'lab-instant-row flex min-h-0 flex-row border-t border-xai-border-subtle',
                  showTruth ? 'flex-[2]' : 'min-h-0 flex-1'
                )}
              >
                {showInstantA && (
                  <PreviewFrame
                    title="Universe A"
                    subtitle="Instant · in-browser bundle"
                    url={instantAUrl}
                    error={instantAError}
                    placeholder="Bundling Universe A…"
                    iframeRef={instantAFrameRef}
                    accent="amber"
                    limitations={instantAUnsupported}
                  />
                )}
                {showInstantB && (
                  <PreviewFrame
                    title="Universe B"
                    subtitle={hasB ? 'Instant · in-browser bundle' : 'Fork B to compare'}
                    url={hasB ? instantBUrl : null}
                    error={hasB ? instantBError : null}
                    placeholder={hasB ? 'Bundling Universe B…' : 'Fork Universe B to enable'}
                    iframeRef={instantBFrameRef}
                    accent="violet"
                    limitations={hasB ? instantBUnsupported : undefined}
                  />
                )}
              </div>
            )}
            {showTruth && (
              <div
                className={clsx(
                  'lab-truth-row flex min-h-0 flex-col border-t border-xai-border-subtle',
                  showInstantRow ? 'flex-[3]' : 'min-h-0 flex-1'
                )}
              >
                <PreviewFrame
                  title={`Truth · ${universeLabel(activeUniverse)}`}
                  subtitle="Full app — WebContainer runs real npm + Vite (Tailwind works here)"
                  url={truthUrl}
                  error={
                    status === 'error'
                      ? truthError ??
                        'WebContainer failed to start. Check Session → Terminal for errors.'
                      : null
                  }
                  placeholder={
                    busy
                      ? 'Starting dev server (npm install may take a minute on first load)…'
                      : 'Click Run in the top bar if the project is idle, then wait for Ready.'
                  }
                  busy={busy}
                  iframeRef={truthFrameRef}
                  accent="cyan"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}