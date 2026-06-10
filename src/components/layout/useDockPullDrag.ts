import { useCallback, useEffect, useRef, useState } from 'react';
import { useDockMotion } from '../../context/DockMotionContext';
import { hitDockZone } from '../../lib/dockZones';
import type { FloatReleasePoint } from '../../lib/workspaceLayout';
import type { DockZoneId } from '../../lib/workspaceLayout';
import { defaultFloatSize } from '../../lib/workspaceLayout';
import type { DockTab } from './WorkspaceDock';

const COMMIT_DRAG_PX = 4;
const HOLD_DRAG_MS = 200;
const DEFAULT_GRAB = { x: 24, y: 16 };

export interface DockPullDragRects {
  getGrabRect: () => DOMRect | undefined;
  getPanelRect: () => DOMRect | undefined;
}

interface DragMeta {
  grabOffsetX: number;
  grabOffsetY: number;
  width: number;
  height: number;
  sourceRect?: DOMRect;
}

export function useDockPullDrag(
  tab: DockTab,
  label: string,
  rects: DockPullDragRects,
  onFloat: (release: FloatReleasePoint) => void,
  onDockToZone: (zone: DockZoneId, release: FloatReleasePoint) => void,
  onTap?: () => void
) {
  const motion = useDockMotion();
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);
  const dragMeta = useRef<DragMeta | null>(null);
  const didDrag = useRef(false);
  const dragActivated = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const captureEl = useRef<HTMLElement | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [arming, setArming] = useState(false);
  const [pulling, setPulling] = useState(false);

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const syncPreview = useCallback(
    (clientX: number, clientY: number) => {
      const meta = dragMeta.current;
      if (!meta) return;
      motion.setDockDrag({
        tab,
        label,
        x: clientX - meta.grabOffsetX,
        y: clientY - meta.grabOffsetY,
        width: meta.width,
        height: meta.height,
      });
    },
    [motion, tab, label]
  );

  const activateDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (dragActivated.current || !dragMeta.current) return;
      dragActivated.current = true;
      setPulling(true);
      motion.setDraggingTab(tab);
      syncPreview(clientX, clientY);
    },
    [motion, tab, syncPreview]
  );

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const meta = dragMeta.current;
      const activated = dragActivated.current;
      const hit = hitDockZone(clientX, clientY);
      const release: FloatReleasePoint = {
        clientX,
        clientY,
        grabOffsetX: meta?.grabOffsetX ?? DEFAULT_GRAB.x,
        grabOffsetY: meta?.grabOffsetY ?? DEFAULT_GRAB.y,
        sourceRect: meta?.sourceRect,
      };

      if (activated && pointerOrigin.current && meta) {
        const dx = clientX - pointerOrigin.current.x;
        const dy = clientY - pointerOrigin.current.y;
        if (Math.hypot(dx, dy) >= COMMIT_DRAG_PX) {
          didDrag.current = true;
          if (hit.inside && hit.zone) {
            onDockToZone(hit.zone, release);
          } else {
            onFloat(release);
          }
        } else if (dragActivated.current) {
          onFloat(release);
        }
      }

      const el = captureEl.current;
      const pointerId = activePointerId.current;
      pointerOrigin.current = null;
      dragMeta.current = null;
      dragActivated.current = false;
      activePointerId.current = null;
      captureEl.current = null;
      setArming(false);
      setPulling(false);
      motion.setDraggingTab(null);
      motion.setDockDrag(null);
      motion.setDropTarget(null, 0);

      if (el && pointerId != null) {
        try {
          el.releasePointerCapture(pointerId);
        } catch {
          /* released */
        }
      }

      if (!activated) {
        onTap?.();
      }
    },
    [motion, onDockToZone, onFloat, onTap]
  );

  useEffect(() => {
    if (!arming) return;

    const onMove = (e: PointerEvent) => {
      if (activePointerId.current !== e.pointerId || !dragMeta.current) return;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      if (!dragActivated.current && pointerOrigin.current) {
        const dx = e.clientX - pointerOrigin.current.x;
        const dy = e.clientY - pointerOrigin.current.y;
        if (Math.hypot(dx, dy) >= COMMIT_DRAG_PX) {
          clearHoldTimer();
          activateDrag(e.clientX, e.clientY);
        }
        return;
      }

      if (!dragActivated.current) return;
      e.preventDefault();
      syncPreview(e.clientX, e.clientY);
      const hit = hitDockZone(e.clientX, e.clientY);
      motion.setDropTarget(hit.zone, hit.proximity);
    };

    const onUp = (e: PointerEvent) => {
      if (activePointerId.current !== e.pointerId) return;
      clearHoldTimer();
      if (dragActivated.current) e.preventDefault();
      const el = captureEl.current;
      if (el) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          /* released */
        }
      }
      finishDrag(e.clientX, e.clientY);
    };

    window.addEventListener('pointermove', onMove, { capture: true });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });
    return () => {
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', onUp, { capture: true });
      window.removeEventListener('pointercancel', onUp, { capture: true });
    };
  }, [arming, syncPreview, motion, finishDrag, activateDrag, clearHoldTimer]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    didDrag.current = false;
    dragActivated.current = false;
    pointerOrigin.current = { x: e.clientX, y: e.clientY };
    lastPointer.current = { x: e.clientX, y: e.clientY };
    activePointerId.current = e.pointerId;
    captureEl.current = e.currentTarget as HTMLElement;

    const panelRect = rects.getPanelRect();
    const grabRect = rects.getGrabRect();
    const anchorX = panelRect?.left ?? grabRect?.left ?? e.clientX - DEFAULT_GRAB.x;
    const anchorY = panelRect?.top ?? grabRect?.top ?? e.clientY - DEFAULT_GRAB.y;
    const grabOffsetX = e.clientX - anchorX;
    const grabOffsetY = e.clientY - anchorY;
    const { width, height } = defaultFloatSize(tab);

    dragMeta.current = {
      grabOffsetX,
      grabOffsetY,
      width,
      height,
      sourceRect: panelRect,
    };

    setArming(true);
    clearHoldTimer();
    holdTimer.current = setTimeout(() => {
      activateDrag(lastPointer.current.x, lastPointer.current.y);
    }, HOLD_DRAG_MS);

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  return {
    pulling,
    didDrag,
    onPointerDown,
  };
}