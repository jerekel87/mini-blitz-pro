import { useEffect, useMemo, useRef, useState } from 'react';
import { bundleInstant } from '../lib/instantBundler';
import type { FlatFiles } from '../types';

const DEBOUNCE_MS = 120;

export function useInstantPreview(files: FlatFiles, entry = 'index.html') {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unsupportedReasons, setUnsupportedReasons] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const blobRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const fileFingerprint = useMemo(() => JSON.stringify(files), [files]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const result = bundleInstant(files, entry);

      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }

      setUnsupportedReasons(result.unsupportedReasons);

      if (result.error) {
        setError(result.error);
        setBlobUrl(null);
        setReady(false);
        return;
      }

      setError(null);
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      blobRef.current = url;
      setBlobUrl(url);
      setReady(true);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [fileFingerprint, entry]);

  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, []);

  return { blobUrl, error, unsupportedReasons, ready };
}