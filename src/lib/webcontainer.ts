import { WebContainer } from '@webcontainer/api';
import type { WebContainerProcess } from '@webcontainer/api';
import { flatToTree } from './fileTree';
import { ensureInspectorInHtml, INSPECTOR_FILENAME, buildInspectorScript } from './previewInspector';
import type { FlatFiles } from '../types';

let instance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (instance) return instance;
  if (!bootPromise) {
    bootPromise = WebContainer.boot().then((wc) => {
      instance = wc;
      return wc;
    });
  }
  return bootPromise;
}

export async function mountProject(files: FlatFiles): Promise<WebContainer> {
  const wc = await getWebContainer();
  await wc.mount(flatToTree(files));
  return wc;
}

/** Paths removed when switching templates (mount merges; orphans break Vite). */
const TEMPLATE_ORPHAN_PATHS = [
  'postcss.config.js',
  'tailwind.config.js',
  'postcss.config.cjs',
  'tailwind.config.cjs',
];

function pathsToRemove(previous: FlatFiles | undefined, next: FlatFiles): string[] {
  const remove = new Set<string>();
  if (previous) {
    for (const path of Object.keys(previous)) {
      if (!(path in next)) remove.add(path);
    }
  }
  for (const path of TEMPLATE_ORPHAN_PATHS) {
    if (!(path in next)) remove.add(path);
  }
  return [...remove];
}

async function rmPath(wc: WebContainer, path: string): Promise<void> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  try {
    await wc.fs.rm(normalized, { recursive: true });
  } catch {
    /* already gone */
  }
}

/** Mount project and delete files/dirs from the previous template. */
export async function replaceProject(
  files: FlatFiles,
  previousFiles?: FlatFiles
): Promise<WebContainer> {
  const wc = await getWebContainer();

  for (const path of pathsToRemove(previousFiles, files)) {
    await rmPath(wc, path);
  }

  const withInspector = {
    ...ensureInspectorInHtml(files),
    [INSPECTOR_FILENAME]: buildInspectorScript('truth'),
  };
  await wc.mount(flatToTree(withInspector));

  for (const path of pathsToRemove(previousFiles, files)) {
    await rmPath(wc, path);
  }

  // Fresh install when dependencies change between templates
  await rmPath(wc, 'node_modules');
  try {
    await wc.fs.rm('/package-lock.json');
  } catch {
    /* optional */
  }

  return wc;
}

export async function writeFile(path: string, content: string): Promise<void> {
  const wc = await getWebContainer();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const dir = normalized.slice(0, normalized.lastIndexOf('/'));
  if (dir && dir !== '/') {
    await wc.fs.mkdir(dir, { recursive: true }).catch(() => undefined);
  }
  await wc.fs.writeFile(normalized, content);
}

export async function readFile(path: string): Promise<string> {
  const wc = await getWebContainer();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return wc.fs.readFile(normalized, 'utf-8');
}

export function streamProcessOutput(
  process: WebContainerProcess,
  onChunk: (data: string) => void
): void {
  process.output.pipeTo(
    new WritableStream({
      write(chunk) {
        onChunk(chunk);
      },
    })
  );
}

export async function waitForExit(process: WebContainerProcess): Promise<number> {
  return process.exit;
}