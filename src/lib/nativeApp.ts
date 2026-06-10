/** True when running inside Capacitor iOS/Android shell (not mobile browser tab). */
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function capacitorPlatform(): 'ios' | 'android' | 'web' {
  const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.() ?? 'web';
  if (p === 'ios' || p === 'android') return p;
  return 'web';
}

/** WebContainer is not supported in iOS WKWebView; Android in-app WebView is limited too. */
export function webContainerLikelySupported(): boolean {
  if (isCapacitorNative()) return false;
  if (typeof window === 'undefined') return false;
  if (!window.crossOriginIsolated) return false;
  const ua = navigator.userAgent;
  const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
  if (mobile) return false;
  return /Chrome|Edg/i.test(ua);
}