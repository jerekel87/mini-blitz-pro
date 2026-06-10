import { useMemo } from 'react';
import {
  SkipBack,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Radio,
} from 'lucide-react';
import clsx from 'clsx';
import type { SessionTimelineStore } from '../lib/sessionTimeline';

interface SessionTimelineProps {
  store: SessionTimelineStore;
  eventCount: number;
  viewIndex: number;
  headIndex: number;
  isReplay: boolean;
  onScrub: (index: number) => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onReturnToLive: () => void;
  embedded?: boolean;
}

const EVENT_DOT: Record<string, string> = {
  files_snapshot: 'bg-xai-warning',
  terminal: 'bg-xai-muted',
  boot_status: 'bg-xai-cyan',
  dual_reality: 'bg-xai-violet',
  template_change: 'bg-xai-fuchsia',
  ai_patch: 'bg-xai-fuchsia',
  session_start: 'bg-xai-success',
};

export function SessionTimeline({
  store,
  eventCount,
  viewIndex,
  headIndex,
  isReplay,
  onScrub,
  onStepBack,
  onStepForward,
  onReturnToLive,
  embedded = false,
}: SessionTimelineProps) {
  const events = store.events;
  const current = events[viewIndex];
  const startTs = store.sessionStartTs;

  const markers = useMemo(() => {
    return events.map((ev, i) => ({
      index: i,
      left: eventCount <= 1 ? 0 : (i / (eventCount - 1)) * 100,
      type: ev.type,
    }));
  }, [events, eventCount]);

  const visibleEvents = useMemo(() => {
    const start = Math.max(0, viewIndex - 6);
    const end = Math.min(eventCount, viewIndex + 4);
    return events.slice(start, end).map((ev, i) => ({ ev, idx: start + i }));
  }, [events, viewIndex, eventCount]);

  if (eventCount === 0) {
    return (
      <div className="session-panel items-center justify-center">
        <p className="text-sm text-xai-muted">Recording session…</p>
      </div>
    );
  }

  return (
    <div className="session-panel">
      {!embedded && (
        <div className="panel-header gap-2">
          <span className="panel-title">Session</span>
          {isReplay ? (
            <button type="button" onClick={onReturnToLive} className="btn-primary ml-auto !py-1.5 !text-2xs">
              <Radio className="h-3 w-3" />
              Live
            </button>
          ) : (
            <span className="badge-live ml-auto">Live</span>
          )}
        </div>
      )}

      {embedded && isReplay && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-xai-border-subtle px-5 py-2.5">
          <span className="text-xs font-medium text-xai-violet">Replay mode</span>
          <button type="button" onClick={onReturnToLive} className="btn-secondary !py-1.5 !text-xs">
            <Radio className="h-3.5 w-3.5" />
            Return to live
          </button>
        </div>
      )}

      <div className="session-transport">
        <button type="button" className="icon-btn" onClick={() => onScrub(0)} title="Start">
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onStepBack}
          disabled={viewIndex <= 0}
          title="Step back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onStepForward}
          disabled={viewIndex >= headIndex}
          title="Step forward"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onScrub(headIndex)}
          disabled={!isReplay}
          title="Jump to live"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        <div className="session-scrub-wrap">
          <input
            type="range"
            min={0}
            max={headIndex}
            value={viewIndex}
            onChange={(e) => onScrub(Number(e.target.value))}
            className="timeline-slider w-full"
            aria-label="Scrub session timeline"
          />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0 -translate-y-1/2">
            {markers.map((m) => (
              <span
                key={m.index}
                className={clsx(
                  'absolute top-1/2 h-1.5 w-px -translate-x-1/2 -translate-y-1/2',
                  EVENT_DOT[m.type] ?? 'bg-xai-border',
                  viewIndex === m.index && 'h-2.5 w-0.5 bg-xai-accent'
                )}
                style={{ left: `${m.left}%` }}
              />
            ))}
          </div>
        </div>

        <span className="shrink-0 font-mono text-xs tabular-nums text-xai-muted">
          {store.formatTime(current?.ts ?? startTs, startTs)}
        </span>
      </div>

      <div className="session-now">
        <p className="session-now-label">
          {isReplay ? 'Replaying' : 'Current'} · {viewIndex + 1} / {eventCount}
        </p>
        <p className="session-now-title">{current?.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-xai-muted">
          {isReplay
            ? 'Truth lane syncs to this snapshot while you scrub.'
            : 'Live recording — use transport controls to revisit prior states.'}
        </p>
      </div>

      <div className="session-events">
        <p className="mb-2 px-3 text-[0.6875rem] font-medium uppercase tracking-wider text-xai-muted">
          Recent events
        </p>
        {visibleEvents.map(({ ev, idx }) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => onScrub(idx)}
            className={clsx('session-event-row', idx === viewIndex && 'session-event-row-active')}
          >
            <span
              className={clsx(
                'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                EVENT_DOT[ev.type] ?? 'bg-xai-border'
              )}
            />
            <span className="session-event-time">{store.formatTime(ev.ts, startTs)}</span>
            <span className="session-event-label">{ev.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}