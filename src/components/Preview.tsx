import { ExternalLink, RefreshCw } from 'lucide-react';
import type { BootStatus } from '../types';

interface PreviewProps {
  url: string | null;
  status: BootStatus;
  error: string | null;
}

export function Preview({ url, status, error }: PreviewProps) {
  const busy = ['booting', 'mounting', 'installing', 'starting'].includes(status);

  return (
    <div className="flex h-full flex-col bg-blitz-panel">
      <div className="panel-header gap-2">
        <span>Preview</span>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <input
            readOnly
            value={url ?? (busy ? 'Starting dev server…' : 'Waiting…')}
            className="min-w-0 flex-1 truncate rounded border border-blitz-border bg-blitz-elevated px-2 py-0.5 font-mono text-[10px] text-blitz-muted"
          />
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="icon-btn shrink-0"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="preview-frame-canvas relative min-h-0 flex-1">
        {error && status === 'error' ? (
          <div className="preview-frame-error flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium text-xai-error">WebContainer error</p>
            <pre className="max-w-full overflow-auto text-xs opacity-90">{error}</pre>
          </div>
        ) : url ? (
          <iframe
            title="App preview"
            src={url}
            className="h-full w-full border-0"
            allow="cross-origin-isolated"
          />
        ) : (
          <div className="preview-frame-placeholder flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <RefreshCw className={`h-8 w-8 text-xai-cyan ${busy ? 'animate-spin' : 'opacity-40'}`} />
            <p className="text-sm text-xai-secondary">
              {busy ? 'Installing dependencies and starting Vite…' : 'Preview will appear here'}
            </p>
            <p className="max-w-xs px-4 text-center text-xs text-xai-muted">
              First boot may take 30–60 seconds while npm installs inside WebContainer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}