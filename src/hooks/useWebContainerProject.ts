import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebContainer, WebContainerProcess } from '@webcontainer/api';
import {
  getWebContainer,
  replaceProject,
  streamProcessOutput,
  waitForExit,
  writeFile,
} from '../lib/webcontainer';
import { getTemplate } from '../lib/templates';
import type { BootStatus, FlatFiles, TemplateId } from '../types';

function pickPaths(files: FlatFiles, paths: string[]): FlatFiles {
  const out: FlatFiles = {};
  for (const path of paths) {
    if (path in files) out[path] = files[path];
  }
  return out;
}

interface UseWebContainerProjectOptions {
  templateId: TemplateId;
  onServerReady?: (url: string, port: number) => void;
  onTerminalOutput?: (data: string) => void;
}

export function useWebContainerProject({
  templateId,
  onServerReady,
  onTerminalOutput,
}: UseWebContainerProjectOptions) {
  const [status, setStatus] = useState<BootStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FlatFiles>(() => getTemplate(templateId).files);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const wcRef = useRef<WebContainer | null>(null);
  const devProcessRef = useRef<WebContainerProcess | null>(null);
  const shellProcessRef = useRef<WebContainerProcess | null>(null);
  const bootedRef = useRef(false);
  const filesRef = useRef<FlatFiles>(files);
  filesRef.current = files;

  const appendLog = useCallback(
    (data: string) => {
      onTerminalOutput?.(data);
    },
    [onTerminalOutput]
  );

  const runInstallAndDev = useCallback(
    async (wc: WebContainer) => {
      setStatus('installing');
      appendLog('\r\n\x1b[36m$ npm install\x1b[0m\r\n');

      const install = await wc.spawn('npm', ['install']);
      streamProcessOutput(install, appendLog);
      const installCode = await waitForExit(install);
      if (installCode !== 0) {
        throw new Error(`npm install failed (exit ${installCode})`);
      }

      setStatus('starting');
      appendLog('\r\n\x1b[36m$ npm run dev\x1b[0m\r\n');

      const dev = await wc.spawn('npm', ['run', 'dev']);
      devProcessRef.current = dev;
      streamProcessOutput(dev, appendLog);
    },
    [appendLog]
  );

  const boot = useCallback(async () => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    setError(null);
    setPreviewUrl(null);

    try {
      setStatus('booting');
      const wc = await getWebContainer();
      wcRef.current = wc;

      wc.on('server-ready', (port, url) => {
        setPreviewUrl(url);
        setStatus('ready');
        onServerReady?.(url, port);
      });

      setStatus('mounting');
      await replaceProject(files);

      await runInstallAndDev(wc);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
      appendLog(`\r\n\x1b[31mError: ${msg}\x1b[0m\r\n`);
      bootedRef.current = false;
    }
  }, [files, appendLog, onServerReady, runInstallAndDev]);

  const reloadProject = useCallback(
    async (newTemplateId: TemplateId) => {
      devProcessRef.current?.kill();
      shellProcessRef.current?.kill();

      const previousFiles = filesRef.current;
      const template = getTemplate(newTemplateId);
      setFiles({ ...template.files });
      setPreviewUrl(null);
      setError(null);

      try {
        const wc = wcRef.current ?? (await getWebContainer());
        wcRef.current = wc;
        setStatus('mounting');
        await replaceProject(template.files, previousFiles);
        await runInstallAndDev(wc);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStatus('error');
        appendLog(`\r\n\x1b[31mError: ${msg}\x1b[0m\r\n`);
      }
    },
    [runInstallAndDev, appendLog]
  );

  const patchLocalFile = useCallback((path: string, content: string) => {
    setFiles((prev) => ({ ...prev, [path]: content }));
  }, []);

  const syncFile = useCallback(async (path: string, content: string) => {
    setFiles((prev) => ({ ...prev, [path]: content }));
    try {
      await writeFile(path, content);
    } catch {
      /* fs may not be ready yet */
    }
  }, []);

  const syncPatchedFiles = useCallback(async (next: FlatFiles, changedPaths: string[]) => {
    if (changedPaths.length === 0) return;

    setFiles((prev) => ({ ...prev, ...pickPaths(next, changedPaths) }));

    const errors: string[] = [];
    await Promise.all(
      changedPaths.map(async (path) => {
        try {
          await writeFile(path, next[path]);
        } catch (e) {
          errors.push(
            `${path}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      })
    );

    if (errors.length > 0) {
      throw new Error(
        `Failed to write ${errors.length} file(s) to WebContainer:\n${errors.join('\n')}`
      );
    }
  }, []);

  const syncAllFiles = useCallback(
    async (next: FlatFiles) => {
      setFiles({ ...next });
      await syncPatchedFiles(next, Object.keys(next));
    },
    [syncPatchedFiles]
  );

  const spawnShell = useCallback(
    async (cols: number, rows: number) => {
      const wc = wcRef.current ?? (await getWebContainer());
      shellProcessRef.current?.kill();

      const shell = await wc.spawn('jsh', [], {
        terminal: { cols, rows },
      });
      shellProcessRef.current = shell;
      return shell;
    },
    []
  );

  useEffect(() => {
    boot();
    return () => {
      devProcessRef.current?.kill();
      shellProcessRef.current?.kill();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- boot once

  return {
    status,
    error,
    files,
    setFiles,
    previewUrl,
    patchLocalFile,
    syncFile,
    syncAllFiles,
    syncPatchedFiles,
    reloadProject,
    spawnShell,
    webcontainer: wcRef,
  };
}