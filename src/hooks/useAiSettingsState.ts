import { useCallback, useState } from 'react';
import { loadAiSettings, saveAiSettings, type AiSettings } from '../lib/aiSettings';

export function useAiSettingsState() {
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings);

  const update = useCallback((patch: Partial<AiSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveAiSettings(next);
      return next;
    });
  }, []);

  const replace = useCallback((next: AiSettings) => {
    saveAiSettings(next);
    setSettings(next);
  }, []);

  return { settings, update, replace };
}