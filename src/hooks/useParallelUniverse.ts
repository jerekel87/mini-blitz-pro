import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyUniversePreset,
  cloneFiles,
  diffUniverses,
  type UniverseId,
  type UniversePresetId,
} from '../lib/parallelUniverse';
import type { FlatFiles } from '../types';

interface UseParallelUniverseOptions {
  /** Live Universe A files (editor + timeline). */
  universeAFiles: FlatFiles;
  onSyncToContainer: (files: FlatFiles) => Promise<void>;
  disabled?: boolean;
}

export function useParallelUniverse({
  universeAFiles,
  onSyncToContainer,
  disabled = false,
}: UseParallelUniverseOptions) {
  const [activeUniverse, setActiveUniverse] = useState<UniverseId>('a');
  const [filesB, setFilesB] = useState<FlatFiles | null>(null);
  const [switching, setSwitching] = useState(false);
  const activeRef = useRef(activeUniverse);
  activeRef.current = activeUniverse;

  const hasB = filesB !== null;
  const divergedPaths = useMemo(
    () => (filesB ? diffUniverses(universeAFiles, filesB) : []),
    [universeAFiles, filesB]
  );

  const editorFiles = activeUniverse === 'a' ? universeAFiles : (filesB ?? universeAFiles);
  const instantAFiles = universeAFiles;
  const instantBFiles = filesB;

  const resetLab = useCallback(() => {
    setFilesB(null);
    setActiveUniverse('a');
  }, []);

  useEffect(() => {
    if (disabled && activeRef.current === 'b') {
      setActiveUniverse('a');
    }
  }, [disabled]);

  const forkB = useCallback(() => {
    if (disabled) return;
    setFilesB(cloneFiles(universeAFiles));
  }, [disabled, universeAFiles]);

  const resetBFromA = useCallback(() => {
    if (disabled || !filesB) return;
    setFilesB(cloneFiles(universeAFiles));
  }, [disabled, filesB, universeAFiles]);

  const promoteBToA = useCallback(async () => {
    if (disabled || !filesB) return;
    setSwitching(true);
    try {
      await onSyncToContainer(filesB);
      setActiveUniverse('a');
      setFilesB(null);
    } finally {
      setSwitching(false);
    }
  }, [disabled, filesB, onSyncToContainer]);

  const applyPreset = useCallback(
    (preset: UniversePresetId) => {
      if (disabled) return;
      if (!filesB) {
        setFilesB(applyUniversePreset(cloneFiles(universeAFiles), preset));
      } else {
        setFilesB(applyUniversePreset(filesB, preset));
      }
    },
    [disabled, filesB, universeAFiles]
  );

  const captureBFromFiles = useCallback(
    (files: FlatFiles) => {
      if (disabled) return;
      setFilesB(cloneFiles(files));
    },
    [disabled]
  );

  const switchUniverse = useCallback(
    async (id: UniverseId) => {
      if (disabled) return;
      if (id === 'b' && !filesB) return;
      if (id === activeUniverse) return;

      setSwitching(true);
      try {
        const target = id === 'a' ? universeAFiles : filesB!;
        await onSyncToContainer(target);
        setActiveUniverse(id);
      } finally {
        setSwitching(false);
      }
    },
    [disabled, activeUniverse, universeAFiles, filesB, onSyncToContainer]
  );

  const updateBFile = useCallback((path: string, content: string) => {
    setFilesB((prev) => (prev ? { ...prev, [path]: content } : prev));
  }, []);

  const patchFilesB = useCallback((changedPaths: string[], merged: FlatFiles) => {
    setFilesB((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      for (const path of changedPaths) {
        if (path in merged) next[path] = merged[path];
      }
      return next;
    });
  }, []);

  const applyPatchToB = useCallback(
    async (merged: FlatFiles, changedPaths: string[]) => {
      if (!filesB || changedPaths.length === 0) return;
      const nextB = { ...filesB };
      for (const path of changedPaths) {
        nextB[path] = merged[path];
      }
      setFilesB(nextB);
      if (activeUniverse === 'b') {
        await onSyncToContainer(nextB);
      }
    },
    [filesB, activeUniverse, onSyncToContainer]
  );

  return {
    activeUniverse,
    hasB,
    filesB,
    editorFiles,
    instantAFiles,
    instantBFiles,
    divergedPaths,
    switching,
    forkB,
    resetBFromA,
    promoteBToA,
    applyPreset,
    captureBFromFiles,
    switchUniverse,
    updateBFile,
    patchFilesB,
    applyPatchToB,
    resetLab,
  };
}