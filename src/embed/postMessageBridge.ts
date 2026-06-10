/**
 * PostMessage bridge for iframe embedding.
 * Use this when you iframe the built MiniBlitz (common for Bolt.new clones).
 *
 * Parent (your Bolt app) sends:
 *   { type: 'loadProject', files: FlatFiles, templateId?: string }
 *   { type: 'applyAiPatch', prompt: string }
 *   { type: 'getFiles' }
 *
 * Child replies with:
 *   { type: 'filesChanged', files: FlatFiles }
 *   { type: 'previewReady', url: string, port: number }
 *   { type: 'terminal', data: string }
 *   { type: 'error', message: string }
 */

import type { FlatFiles } from '../types';

export function setupPostMessageBridge(
  embedRef: React.RefObject<any>, // MiniBlitzHandle
  onFilesChange?: (files: FlatFiles) => void
) {
  window.addEventListener('message', async (event) => {
    const { data } = event;
    if (!data || typeof data !== 'object') return;

    const { type, files, templateId, prompt } = data;

    try {
      switch (type) {
        case 'loadProject':
          if (files) {
            await embedRef.current?.loadProject(files, templateId);
          }
          break;

        case 'applyAiPatch':
          if (prompt) {
            await embedRef.current?.applyPatch(prompt);
          }
          break;

        case 'getFiles':
          const current = embedRef.current?.getFiles?.();
          window.parent.postMessage({ type: 'filesChanged', files: current }, '*');
          break;

        case 'runCommand':
          if (data.command) {
            await embedRef.current?.runCommand(data.command);
          }
          break;
      }
    } catch (e: any) {
      window.parent.postMessage({ type: 'error', message: e.message }, '*');
    }
  });

  // Forward important events to parent
  if (onFilesChange) {
    // In a real implementation you would subscribe to the embed's onFilesChange
    // and forward: window.parent.postMessage({ type: 'filesChanged', files }, '*');
  }
}
