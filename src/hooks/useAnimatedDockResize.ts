import { useEffect, useRef, type RefObject } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { animateValue, MOTION_MS } from '../lib/motion';

/**
 * Smoothly resizes the bottom dock panel instead of jumping imperatively.
 */
export function useAnimatedDockResize(
  panelRef: RefObject<ImperativePanelHandle | null>,
  targetPercent: number,
  enabled: boolean
) {
  const currentRef = useRef(targetPercent);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !panelRef.current) return;

    const from = currentRef.current;
    const to = targetPercent;
    if (Math.abs(from - to) < 0.5) {
      panelRef.current.resize(to);
      currentRef.current = to;
      return;
    }

    cancelRef.current?.();
    cancelRef.current = animateValue(
      from,
      to,
      MOTION_MS.normal,
      (v) => {
        panelRef.current?.resize(v);
        currentRef.current = v;
      },
      () => {
        cancelRef.current = null;
      }
    );

    return () => cancelRef.current?.();
  }, [targetPercent, enabled, panelRef]);
}