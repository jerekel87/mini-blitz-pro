import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  INSPECTOR_MESSAGE_SOURCE,
  normalizeInspectorPath,
} from '../lib/previewInspector';
import type { DomHint } from '../lib/sourceNavigation';
import type { FlatFiles } from '../types';

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  lane?: 'instant' | 'truth';
  dom?: DomHint;
}

interface UsePreviewNavigationOptions {
  knownFiles: FlatFiles;
  onNavigate: (loc: SourceLocation) => void;
  instantFrameRef: RefObject<HTMLIFrameElement>;
  instantBFrameRef?: RefObject<HTMLIFrameElement>;
  truthFrameRef: RefObject<HTMLIFrameElement>;
}

export function usePreviewNavigation({
  knownFiles,
  onNavigate,
  instantFrameRef,
  instantBFrameRef,
  truthFrameRef,
}: UsePreviewNavigationOptions) {
  const [hoverLine, setHoverLine] = useState<SourceLocation | null>(null);
  const pathsRef = useRef<string[]>([]);
  pathsRef.current = Object.keys(knownFiles);

  const postToFrames = useCallback(
    (payload: Record<string, unknown>) => {
      const msg = { source: INSPECTOR_MESSAGE_SOURCE, ...payload };
      instantFrameRef.current?.contentWindow?.postMessage(msg, '*');
      instantBFrameRef?.current?.contentWindow?.postMessage(msg, '*');
      truthFrameRef.current?.contentWindow?.postMessage(msg, '*');
    },
    [instantFrameRef, instantBFrameRef, truthFrameRef]
  );

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.source !== INSPECTOR_MESSAGE_SOURCE) return;
      if (event.data.type === 'navigate') {
        const file = normalizeInspectorPath(event.data.file ?? '', pathsRef.current);
        if (!file) return;
        const dom = event.data.dom;
        onNavigate({
          file,
          line: Number(event.data.line) || 1,
          column: Number(event.data.column) || 1,
          lane: event.data.lane,
          dom:
            dom && typeof dom.tag === 'string'
              ? {
                  tag: dom.tag,
                  className: typeof dom.className === 'string' ? dom.className : undefined,
                  text: typeof dom.text === 'string' ? dom.text : undefined,
                }
              : undefined,
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onNavigate]);

  useEffect(() => {
    if (hoverLine?.file && hoverLine.line) {
      postToFrames({
        type: 'highlight',
        file: hoverLine.file,
        line: hoverLine.line,
        column: hoverLine.column,
      });
    } else {
      postToFrames({ type: 'clear-highlight' });
    }
  }, [hoverLine, postToFrames]);

  const setEditorCursor = useCallback((file: string | null, line: number, column = 1) => {
    if (!file) {
      setHoverLine(null);
      return;
    }
    const resolved = normalizeInspectorPath(file, pathsRef.current) ?? file;
    if (knownFiles[resolved]) {
      setHoverLine({ file: resolved, line, column });
    }
  }, [knownFiles]);

  const setInspectMode = useCallback(
    (enabled: boolean) => {
      postToFrames({ type: 'set-inspect-mode', enabled });
    },
    [postToFrames]
  );

  return { hoverLine, setEditorCursor, setInspectMode };
}