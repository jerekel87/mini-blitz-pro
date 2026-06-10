import { useCallback, useEffect, useRef, useState } from 'react';
import { SessionTimelineStore, describeFileChange } from '../lib/sessionTimeline';
import type { TimelineViewState } from '../lib/sessionTimeline';
import type { DualRealityState } from '../lib/dualReality';
import type { BootStatus, FlatFiles, TemplateId } from '../types';

export type { DualRealityState };

const SNAPSHOT_DEBOUNCE_MS = 600;

interface UseSessionTimelineOptions {
  liveFiles: FlatFiles;
  templateId: TemplateId;
  bootStatus: BootStatus;
  onRestoreToContainer: (files: FlatFiles) => Promise<void>;
  lastEditedPath: string | null;
  enabled?: boolean;
}

export function useSessionTimeline({
  liveFiles,
  templateId,
  bootStatus,
  onRestoreToContainer,
  lastEditedPath,
  enabled = true,
}: UseSessionTimelineOptions) {
  const storeRef = useRef(new SessionTimelineStore());
  const [eventCount, setEventCount] = useState(0);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [viewState, setViewState] = useState<TimelineViewState | null>(null);
  const restoringRef = useRef(false);
  const initializedRef = useRef(false);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastPathRef = useRef<string | null>(null);

  const bump = useCallback(() => {
    setEventCount(storeRef.current.events.length);
  }, []);

  const headIndex = Math.max(0, eventCount - 1);
  const isReplay = viewIndex !== null && viewIndex < headIndex;

  const applyViewIndex = useCallback(
    async (index: number | null) => {
      const store = storeRef.current;
      if (index === null || index >= store.headIndex) {
        setViewIndex(null);
        setViewState(null);
        if (!restoringRef.current) {
          restoringRef.current = true;
          await onRestoreToContainer(liveFiles);
          restoringRef.current = false;
        }
        return;
      }

      setViewIndex(index);
      const state = store.getViewState(index);
      setViewState(state);
      restoringRef.current = true;
      await onRestoreToContainer(state.files);
      restoringRef.current = false;
    },
    [liveFiles, onRestoreToContainer]
  );

  const returnToLive = useCallback(() => {
    applyViewIndex(null);
  }, [applyViewIndex]);

  const scrubTo = useCallback(
    (index: number) => {
      if (index >= storeRef.current.headIndex) {
        applyViewIndex(null);
      } else {
        applyViewIndex(index);
      }
    },
    [applyViewIndex]
  );

  const stepBack = useCallback(() => {
    const current = viewIndex ?? headIndex;
    if (current > 0) scrubTo(current - 1);
  }, [viewIndex, headIndex, scrubTo]);

  const stepForward = useCallback(() => {
    const current = viewIndex ?? headIndex;
    if (current < headIndex) scrubTo(current + 1);
  }, [viewIndex, headIndex, scrubTo]);

  // Init session once files exist
  useEffect(() => {
    if (!enabled || initializedRef.current) return;
    if (Object.keys(liveFiles).length === 0) return;
    initializedRef.current = true;
    storeRef.current.startSession(templateId, liveFiles);
    bump();
  }, [enabled, liveFiles, templateId, bump]);

  // Debounced file snapshots
  useEffect(() => {
    if (!enabled || restoringRef.current || isReplay) return;
    lastPathRef.current = lastEditedPath;
    clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      if (restoringRef.current) return;
      const label = describeFileChange(lastPathRef.current);
      if (storeRef.current.recordFilesSnapshot(liveFiles, label)) bump();
    }, SNAPSHOT_DEBOUNCE_MS);
    return () => clearTimeout(snapshotTimerRef.current);
  }, [liveFiles, lastEditedPath, enabled, isReplay, bump]);

  // Boot status
  useEffect(() => {
    if (!enabled || restoringRef.current) return;
    storeRef.current.recordBootStatus(bootStatus);
    bump();
  }, [bootStatus, enabled, bump]);

  const recordDualReality = useCallback(
    (state: DualRealityState) => {
      if (!enabled || restoringRef.current) return;
      storeRef.current.recordDualReality(state);
      bump();
    },
    [enabled, bump]
  );

  const recordTerminal = useCallback(
    (chunk: string) => {
      if (!enabled) return;
      storeRef.current.recordTerminal(chunk);
      bump();
    },
    [enabled, bump]
  );

  const recordAiPatch = useCallback(
    (summary: string, files: FlatFiles) => {
      if (!enabled) return;
      storeRef.current.recordAiPatch(summary, files);
      bump();
    },
    [enabled, bump]
  );

  const recordTemplateChange = useCallback(
    (id: TemplateId, files: FlatFiles) => {
      storeRef.current.recordTemplateChange(id, files);
      storeRef.current.flushTerminal();
      bump();
      setViewIndex(null);
      setViewState(null);
    },
    [bump]
  );

  const displayFiles = isReplay && viewState ? viewState.files : liveFiles;
  const displayTerminal = isReplay && viewState ? viewState.terminal : null;

  return {
    store: storeRef.current,
    eventCount,
    headIndex,
    viewIndex: viewIndex ?? headIndex,
    isReplay,
    viewState,
    displayFiles,
    displayTerminal,
    scrubTo,
    stepBack,
    stepForward,
    returnToLive,
    recordTerminal,
    recordTemplateChange,
    recordDualReality,
    recordAiPatch,
  };
}