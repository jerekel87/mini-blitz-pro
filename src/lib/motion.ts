export const MOTION_MS = {
  fast: 180,
  normal: 280,
  slow: 380,
} as const;

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function animateValue(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (value: number) => void,
  onDone?: () => void,
  ease: (t: number) => number = easeOutCubic
): () => void {
  const start = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    onUpdate(lerp(from, to, ease(t)));
    if (t < 1) {
      frame = requestAnimationFrame(tick);
    } else {
      onDone?.();
    }
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

import type { DockZoneId } from './workspaceLayout';
import { getDockZoneRect, hitDockZone, type DockZoneHit } from './dockZones';

export type { DockZoneHit };
export { hitDockZone, getDockZoneRect };

/** @deprecated Use hitDockZone */
export function hitDockDropZone(clientX: number, clientY: number, pad = 36) {
  const hit = hitDockZone(clientX, clientY, pad);
  return { inside: hit.inside, proximity: hit.proximity };
}

/** @deprecated Use getDockZoneRect(zone) */
export function getDockDropZoneRect(zone: DockZoneId = 'bottom') {
  return getDockZoneRect(zone);
}