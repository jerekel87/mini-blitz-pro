import { useState } from 'react';
import { Monitor, X } from 'lucide-react';
import { isCapacitorNative, webContainerLikelySupported } from '../lib/nativeApp';

export function NativeAppBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!isCapacitorNative() && webContainerLikelySupported()) return null;

  const native = isCapacitorNative();

  return (
    <div
      className="native-app-banner flex shrink-0 items-start gap-3 border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-100/90"
      role="status"
    >
      <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
      <p className="min-w-0 flex-1 leading-relaxed">
        {native ? (
          <>
            <strong className="font-medium text-amber-50">Mobile app — limited runtime.</strong> Edit code and
            use Ask Jeremy here. npm, terminal, and full Vite preview need{' '}
            <strong className="font-medium text-amber-50">desktop Chrome</strong> or your deployed site in a
            browser.
          </>
        ) : (
          <>
            <strong className="font-medium text-amber-50">WebContainer unavailable</strong> in this browser.
            Use Chrome or Edge on desktop for npm install, terminal, and live preview.
          </>
        )}
      </p>
      <button
        type="button"
        className="shrink-0 rounded p-1 text-amber-200/80 hover:bg-amber-500/20"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}