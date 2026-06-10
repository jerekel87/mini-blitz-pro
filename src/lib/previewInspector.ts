/** Injected into preview iframes — click-to-source + highlight from editor. */

export const INSPECTOR_MESSAGE_SOURCE = 'mini-blitz-inspector';

export function normalizeInspectorPath(fileName: string, knownPaths: string[]): string | null {
  const normalized = fileName.replace(/\\/g, '/');
  const candidates = [
    normalized,
    normalized.replace(/^.*\/(src\/[^/]+.*)$/, '$1'),
    normalized.replace(/^.*\/(index\.html)$/, '$1'),
    normalized.replace(/^\//, ''),
    normalized.split('/').slice(-2).join('/'),
    normalized.split('/').pop() ?? '',
  ].filter(Boolean);

  for (const c of candidates) {
    if (knownPaths.includes(c)) return c;
  }

  const base = normalized.split('/').pop();
  if (base) {
    const hit = knownPaths.find((p) => p === base || p.endsWith(`/${base}`));
    if (hit) return hit;
  }

  return null;
}

export function buildInspectorScript(lane: 'instant' | 'truth'): string {
  return `(function() {
  var MSG = ${JSON.stringify(INSPECTOR_MESSAGE_SOURCE)};
  var LANE = ${JSON.stringify(lane)};
  var HIGHLIGHT = 'blitz-inspector-highlight';

  function normalizePath(p) {
    if (!p) return null;
    p = String(p).replace(/\\\\/g, '/');
    var idx = p.indexOf('src/');
    if (idx >= 0) return p.slice(idx);
    if (p.slice(-10) === 'index.html') return 'index.html';
    var parts = p.split('/');
    return parts.length >= 2 ? parts.slice(-2).join('/') : parts[parts.length - 1];
  }

  function getFiber(el) {
    if (!el || el.nodeType !== 1) return null;
    var key = Object.keys(el).find(function(k) {
      return k.indexOf('__reactFiber') === 0 || k.indexOf('__reactInternalInstance') === 0;
    });
    return key ? el[key] : null;
  }

  function debugSourceFromFiber(fiber, dom) {
    if (!fiber) return null;
    var owned = null;
    var deepest = null;
    var f = fiber;
    while (f) {
      if (f._debugSource) {
        if (f.stateNode === dom) owned = f._debugSource;
        var line = f._debugSource.lineNumber || 0;
        if (!deepest || line > (deepest.lineNumber || 0)) deepest = f._debugSource;
      }
      f = f.return;
    }
    return owned || deepest;
  }

  /** Best JSX source for this DOM node. */
  function innermostDebugSource(el) {
    var fiber = getFiber(el);
    if (!fiber) return null;
    return debugSourceFromFiber(fiber, el);
  }

  function sourceFromDebug(debug) {
    if (!debug) return null;
    return {
      file: normalizePath(debug.fileName),
      line: debug.lineNumber || 1,
      column: debug.columnNumber || 1
    };
  }

  function domText(node) {
    if (!node || node.nodeType !== 1) return '';
    var direct = '';
    for (var i = 0; i < node.childNodes.length; i++) {
      var c = node.childNodes[i];
      if (c.nodeType === 3) direct += c.textContent || '';
    }
    var t = (direct.trim() || (node.textContent || '')).replace(/\\s+/g, ' ').trim();
    return t.slice(0, 80);
  }

  function domHint(node) {
    return {
      tag: (node.tagName || '').toLowerCase(),
      className: typeof node.className === 'string' ? node.className : '',
      text: domText(node)
    };
  }

  function findReactSource(el) {
    var node = el && el.nodeType === 1 ? el : el && el.parentElement;
    if (!node) return null;
    var fiber = getFiber(node);
    var sources = [];
    var f = fiber;
    while (f) {
      if (f._debugSource) sources.push(f._debugSource);
      f = f.return;
    }
    var src = null;
    if (sources.length) {
      var best = sources[0];
      for (var i = 1; i < sources.length; i++) {
        if ((sources[i].lineNumber || 0) > (best.lineNumber || 0)) best = sources[i];
      }
      src = sourceFromDebug(best);
    }
    if (!src) return null;
    src.dom = domHint(node);
    return src;
  }

  function clearHighlights() {
    document.querySelectorAll('.' + HIGHLIGHT).forEach(function(el) {
      el.classList.remove(HIGHLIGHT);
    });
  }

  function highlightElement(el) {
    clearHighlights();
    if (!el || el.nodeType !== 1) return;
    el.classList.add(HIGHLIGHT);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function highlightAt(file, line, column) {
    clearHighlights();
    if (!file || !line) return;
    var col = column || 1;
    var hits = [];
    document.querySelectorAll('*').forEach(function(el) {
      var debug = innermostDebugSource(el);
      if (!debug) return;
      var f = normalizePath(debug.fileName);
      if (f === file && debug.lineNumber === line) {
        var dc = debug.columnNumber || 1;
        if (column && dc !== col) return;
        hits.push({ el: el, col: dc });
      }
    });
    if (!hits.length) return;
    hits.sort(function(a, b) { return a.col - b.col; });
    var target = hits[0].el;
    if (column) {
      var exact = hits.find(function(h) { return h.col === col; });
      if (exact) target = exact.el;
    }
    highlightElement(target);
  }

  var inspectMode = false;

  function setInspectMode(on) {
    inspectMode = !!on;
    if (document.body) {
      document.body.setAttribute('data-blitz-inspect-mode', inspectMode ? '1' : '0');
    }
    if (!inspectMode) clearHighlights();
  }

  var style = document.createElement('style');
  style.textContent = [
    '.' + HIGHLIGHT + ' { outline: 2px solid #58a6ff !important; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(88,166,255,0.25) !important; }',
    'body[data-blitz-inspect-mode="1"], body[data-blitz-inspect-mode="1"] * { cursor: crosshair !important; }'
  ].join('\\n');
  (document.head || document.documentElement).appendChild(style);

  document.addEventListener('click', function(e) {
    if (!inspectMode && !e.altKey) return;
    var el = e.target;
    if (el && el.nodeType !== 1) el = el.parentElement;
    var src = findReactSource(el);
    if (!src || !src.file) return;
    e.preventDefault();
    e.stopPropagation();
    highlightElement(el);
    parent.postMessage({
      source: MSG,
      type: 'navigate',
      file: src.file,
      line: src.line,
      column: src.column,
      lane: LANE,
      dom: src.dom
    }, '*');
  }, true);

  window.addEventListener('message', function(e) {
    if (!e.data || e.data.source !== MSG) return;
    if (e.data.type === 'set-inspect-mode') setInspectMode(e.data.enabled);
    if (e.data.type === 'highlight') highlightAt(e.data.file, e.data.line, e.data.column);
    if (e.data.type === 'clear-highlight') clearHighlights();
  });
})();`;
}

export const INSPECTOR_FILENAME = 'blitz-inspector.js';

export function withInspectorFile(files: Record<string, string>, lane?: 'instant' | 'truth'): Record<string, string> {
  const script = buildInspectorScript(lane ?? 'truth');
  const next = { ...files, [INSPECTOR_FILENAME]: script };
  return ensureInspectorInHtml(next);
}

export function ensureInspectorInHtml(files: Record<string, string>): Record<string, string> {
  const next = { ...files };
  for (const [path, content] of Object.entries(next)) {
    if (!path.endsWith('.html') || path.includes('node_modules')) continue;
    if (content.includes(INSPECTOR_FILENAME)) continue;
    const tag = `<script src="/${INSPECTOR_FILENAME}"></script>`;
    if (content.includes('</body>')) {
      next[path] = content.replace('</body>', `  ${tag}\n</body>`);
    } else {
      next[path] = content + tag;
    }
  }
  return next;
}