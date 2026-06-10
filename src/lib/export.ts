import type { FlatFiles } from '../types';

/**
 * Export the current project files as a clean ZIP.
 * Skips common build/dependency folders for a "clean" export (like StackBlitz).
 */
export async function exportProjectAsZip(
  files: FlatFiles,
  projectName: string = 'mini-blitz-project'
): Promise<void> {
  // Dynamic import to keep bundle light
  const JSZip = (await import('jszip')).default;

  const zip = new JSZip();

  const SKIP_PREFIXES = [
    'node_modules/',
    '.git/',
    'dist/',
    'build/',
    '.next/',
    'out/',
    '.bolt/', // internal
  ];

  Object.entries(files).forEach(([path, content]) => {
    const shouldSkip = SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (shouldSkip) return;

    // Ensure no leading slash for zip
    const cleanPath = path.replace(/^\/+/, '');
    zip.file(cleanPath, content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/[^a-z0-9_-]/gi, '_')}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
