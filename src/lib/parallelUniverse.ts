import type { FlatFiles } from '../types';

export type UniverseId = 'a' | 'b';

export type UniversePresetId = 'cta-violet' | 'minimal-copy' | 'high-contrast';

export const UNIVERSE_PRESETS: { id: UniversePresetId; label: string; detail: string }[] = [
  {
    id: 'cta-violet',
    label: 'Violet CTA',
    detail: 'Swap cyan button for violet + new label',
  },
  {
    id: 'minimal-copy',
    label: 'Alt copy',
    detail: 'Different headline and description in Universe B',
  },
  {
    id: 'high-contrast',
    label: 'High contrast',
    detail: 'Darker card and brighter body text',
  },
];

export function cloneFiles(files: FlatFiles): FlatFiles {
  return Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v]));
}

export function diffUniverses(a: FlatFiles, b: FlatFiles): string[] {
  const paths = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...paths].filter((p) => (a[p] ?? '') !== (b[p] ?? '')).sort();
}

const APP_PATH = 'src/App.tsx';

export function applyUniversePreset(files: FlatFiles, preset: UniversePresetId): FlatFiles {
  const next = cloneFiles(files);
  if (!next[APP_PATH]) return next;

  let app = next[APP_PATH];
  switch (preset) {
    case 'cta-violet':
      app = app
        .replace(/bg-cyan-500/g, 'bg-violet-500')
        .replace(/hover:bg-cyan-400/g, 'hover:bg-violet-400')
        .replace(/text-cyan-300/g, 'text-violet-300')
        .replace(/Increment/g, 'Universe B');
      break;
    case 'minimal-copy':
      app = app
        .replace(/Mini Blitz \+ WebContainer/g, 'Universe B experiment')
        .replace(
          /Real Vite dev server running inside your browser\./g,
          'Compare this lane against Universe A in the lab.'
        );
      break;
    case 'high-contrast':
      app = app
        .replace(/bg-slate-900\/80/g, 'bg-black')
        .replace(/text-slate-400/g, 'text-slate-100')
        .replace(/border-slate-700/g, 'border-white/30');
      break;
  }
  next[APP_PATH] = app;
  return next;
}

export function universeLabel(id: UniverseId): string {
  return id === 'a' ? 'Universe A' : 'Universe B';
}