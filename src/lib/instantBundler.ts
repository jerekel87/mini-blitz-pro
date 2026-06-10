import type { FlatFiles } from '../types';
import { buildInspectorScript } from './previewInspector';

export interface BundleResult {
  html: string;
  error?: string;
  unsupportedReasons: string[];
}

const NPM_GLOBALS: Record<string, string> = {
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/client': 'ReactDOM',
};

/** UMD globals shims after stripping ESM imports */
const NPM_SHIMS: Record<string, string> = {
  react: 'const { useState, useEffect, useCallback, useMemo, StrictMode } = React;',
  'react-dom/client': 'const createRoot = ReactDOM.createRoot;',
};

export function bundleInstant(files: FlatFiles, entry = 'index.html'): BundleResult {
  const unsupportedReasons: string[] = [];
  const normalized = Object.fromEntries(
    Object.entries(files).map(([k, v]) => [k.replace(/^\/+/, ''), v])
  );

  if (files['tailwind.config.js'] || files['postcss.config.js']) {
    unsupportedReasons.push('Tailwind/PostCSS (requires Vite in Truth lane)');
  }
  if (normalized['src/index.css']?.includes('@tailwind')) {
    unsupportedReasons.push('@tailwind directives (Truth lane only)');
  }

  const entryPath = entry.replace(/^\/+/, '');
  let htmlEntry = entryPath;
  if (!normalized[htmlEntry]) {
    const htmlFile = Object.keys(normalized).find((f) => f.endsWith('.html'));
    if (!htmlFile) {
      return {
        html: '',
        error: 'No index.html found',
        unsupportedReasons,
      };
    }
    htmlEntry = htmlFile;
  }

  const usesReact =
    Object.keys(normalized).some((p) => p.endsWith('.tsx') || p.endsWith('.jsx')) ||
    normalized['package.json']?.includes('"react"');

  const result = buildHtml(normalized, htmlEntry, new Set(), usesReact, unsupportedReasons);
  return { ...result, unsupportedReasons };
}

function buildHtml(
  files: FlatFiles,
  path: string,
  visiting: Set<string>,
  usesReact: boolean,
  unsupportedReasons: string[]
): { html: string; error?: string } {
  if (visiting.has(path)) {
    return { html: '', error: `Circular dependency: ${path}` };
  }
  visiting.add(path);

  let html = files[path];
  if (!html) {
    return { html: '', error: `File not found: ${path}` };
  }

  if (usesReact) {
    const reactScripts = `
<script>window.process={env:{NODE_ENV:'development'}};</script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`;
    html = html.replace(/<head([^>]*)>/i, `<head$1>${reactScripts}`) || reactScripts + html;
  }

  html = html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi, (tag) => {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return tag;
    const href = resolvePath(path, hrefMatch[1]);
    if (href.startsWith('http') || href.startsWith('//') || href.startsWith('data:')) return tag;
    const css = files[href];
    if (css === undefined) return `<!-- missing: ${href} -->`;
    if (css.includes('@tailwind') || css.includes('@apply')) {
      unsupportedReasons.push(`CSS in ${href} uses Tailwind (Truth lane)`);
      return `<style data-instant-fallback>
body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
#root { min-height: 100vh; }
button { cursor: pointer; padding: 0.5rem 1rem; border-radius: 8px; border: none; background: #3b82f6; color: white; }
</style>`;
    }
    return `<style data-file="${href}">\n${css}\n</style>`;
  });

  html = html.replace(/<script\s+([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, inlineBody) => {
    if (/\bsrc\s*=/i.test(attrs)) return processExternalScript(files, path, attrs, full, visiting, usesReact, unsupportedReasons);
    if (/type=["']text\/babel["']/i.test(attrs)) {
      return `<script type="text/babel">\n${inlineBody}\n</script>`;
    }
    if (/type=["']module["']/i.test(attrs)) {
      const compiled = transformModule(files, path, inlineBody, visiting, path, unsupportedReasons);
      if (compiled.error) return `<!-- error: ${compiled.error} -->`;
      const scriptType = usesReact ? ' type="text/babel"' : '';
      return `<script${scriptType}>\n${compiled.code}\n</script>`;
    }
    return full;
  });

  html = html.replace(/<script\s+([^>]*)\/?>/gi, (full, attrs) => {
    if (!/\bsrc\s*=/i.test(attrs)) return full;
    return processExternalScript(files, path, attrs, full, visiting, usesReact, unsupportedReasons);
  });

  const bridge = getConsoleBridgeScript('mini-blitz-instant');
  const inspector = `<script>${buildInspectorScript('instant')}</script>`;
  const injected = `${bridge}\n${inspector}`;
  html = html.replace(/<head([^>]*)>/i, `<head$1>\n${injected}`) ||
    html.replace(/<body([^>]*)>/i, `<body$1>\n${injected}`) ||
    injected + html;

  visiting.delete(path);
  return { html };
}

function processExternalScript(
  files: FlatFiles,
  parentPath: string,
  attrs: string,
  _fullTag: string,
  visiting: Set<string>,
  usesReact: boolean,
  unsupportedReasons: string[]
): string {
  const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
  if (!srcMatch) return _fullTag;

  const src = resolvePath(parentPath, srcMatch[1]);
  if (src.startsWith('http') || src.startsWith('//') || src.startsWith('data:')) {
    return `<script src="${src}"></script>`;
  }

  const content = files[src];
  if (content === undefined) return `<!-- missing script: ${src} -->`;

  const isModule =
    /type=["']module["']/i.test(attrs) || src.endsWith('.ts') || src.endsWith('.tsx');
  if (isModule) {
    const result = transformModule(files, parentPath, content, visiting, src, unsupportedReasons);
    if (result.error) return `<!-- error in ${src}: ${result.error} -->`;
    const scriptType =
      usesReact && (src.endsWith('.tsx') || src.endsWith('.jsx')) ? ' type="text/babel"' : '';
    return `<script${scriptType} data-file="${src}">\n${result.code}\n</script>`;
  }

  if (/type=["']text\/babel["']/i.test(attrs) || src.endsWith('.jsx')) {
    return `<script type="text/babel" data-file="${src}">\n${content}\n</script>`;
  }

  return `<script data-file="${src}">\n${content}\n</script>`;
}

function transformModule(
  files: FlatFiles,
  _parentPath: string,
  code: string,
  visiting: Set<string>,
  modulePath: string,
  unsupportedReasons: string[]
): { code?: string; error?: string } {
  const basePath = modulePath.includes('/') ? modulePath.replace(/\/[^/]+$/, '') : '';
  const importRegex =
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  const imports = [...code.matchAll(importRegex)];

  let bundled = stripTypes(code);
  const modules: string[] = [];
  const shims: string[] = [];

  for (const [, spec] of imports) {
    if (spec.startsWith('http') || spec.startsWith('//')) continue;

    if (/\.(css|scss|sass|less)(\?.*)?$/i.test(spec)) {
      bundled = bundled.replace(
        new RegExp(`import\\s+[^'"]*['"]${escapeRegex(spec)}['"]\\s*;?`, 'g'),
        ''
      );
      continue;
    }

    if (!spec.startsWith('.') && !spec.startsWith('/')) {
      if (NPM_GLOBALS[spec]) {
        bundled = bundled.replace(
          new RegExp(`import\\s+[^'"]*['"]${escapeRegex(spec)}['"]\\s*;?`, 'g'),
          ''
        );
        if (NPM_SHIMS[spec]) shims.push(NPM_SHIMS[spec]);
        continue;
      }
      unsupportedReasons.push(`npm package "${spec}" (Truth lane only)`);
      return {
        error: `Instant preview cannot load npm package "${spec}". Use Truth lane.`,
      };
    }

    let resolved = resolvePath(basePath ? `${basePath}/dummy` : modulePath, spec);
    if (!resolved.includes('.')) {
      resolved = tryResolve(files, resolved);
    }

    const depContent = files[resolved];
    if (depContent === undefined) {
      return { error: `Cannot resolve "${spec}" from ${modulePath}` };
    }

    const depResult = transformModule(files, resolved, depContent, visiting, resolved, unsupportedReasons);
    if (depResult.error) return { error: depResult.error };
    modules.push(depResult.code ?? '');
    bundled = bundled.replace(
      new RegExp(`import\\s+[^'"]*['"]${escapeRegex(spec)}['"]\\s*;?`, 'g'),
      ''
    );
  }

  bundled = bundled.replace(/export\s+default\s+/g, '');
  bundled = bundled.replace(/export\s+/g, '');

  if (modulePath.endsWith('.tsx') || modulePath.endsWith('.jsx')) {
    bundled = bundled.replace(/:\s*React\.\w+/g, '');
  }

  const allCode = [...modules, ...shims, bundled].filter(Boolean).join('\n\n');
  return { code: allCode };
}

function tryResolve(files: FlatFiles, base: string): string {
  for (const ext of ['', '.ts', '.js', '.tsx', '.jsx']) {
    const candidate = base + ext;
    if (files[candidate]) return candidate;
  }
  return base;
}

function stripTypes(code: string): string {
  return code
    .replace(
      /:\s*(?:string|number|boolean|void|unknown|any|never|null|undefined|object|Date|HTMLElement|\w+(?:<[^>]+>)?)(?:\[\])?(?=\s*[,;=)\]}])/g,
      ''
    )
    .replace(/:\s*\{[^}]*\}(?=\s*[,;=)\]}])/g, '')
    .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')
    .replace(/\)!/g, ')')
    .replace(/as\s+\w+/g, '');
}

function resolvePath(from: string, rel: string): string {
  if (rel.startsWith('http') || rel.startsWith('//')) return rel;
  const dir = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
  const parts = [...(dir ? dir.split('/') : []), ...rel.split('/')];
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') resolved.pop();
    else resolved.push(p);
  }
  return resolved.join('/');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getConsoleBridgeScript(source: string): string {
  return `<script>
(function() {
  const send = (type, args) => {
    parent.postMessage({ source: '${source}', type, args: args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
      catch { return String(a); }
    })}, '*');
  };
  ['log','info','warn','error'].forEach(m => {
    const orig = console[m];
    console[m] = function(...args) { send(m, args); orig.apply(console, args); };
  });
  window.onerror = (msg, _u, line) => { send('error', [msg + ' (line ' + line + ')']); return false; };
})();
</script>`;
}