import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PanelBottomClose } from 'lucide-react';
import clsx from 'clsx';
import { DockDragDots } from './DockDragDots';
import { useDockMotion } from '../../context/DockMotionContext';
import type { DockTab } from './WorkspaceDock';
import type { DockZoneId, FloatRect } from '../../lib/workspaceLayout';
import { clampFloatRect, floatRectFromRelease } from '../../lib/workspaceLayout';
import { hitDockZone } from '../../lib/motion';

interface FloatingPanelProps {
  title: string;
  tabId: DockTab;
  rect: FloatRect;
  onRectChange: (rect: FloatRect) => void;
  onDock: (zone: DockZoneId) => void;
  zIndex?: number;
  children: React.ReactNode;
}

export function FloatingPanel({
  title,
  tabId,
  rect,
  onRectChange,
  onDock,
  zIndex = 60,
  children,
}: FloatingPanelProps) {
  const motion = useDockMotion();
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragOrigin = useRef({
    x: 0,
    y: 0,
    rect,
    grabOffsetX: 24,
    grabOffsetY: 16,
  });
  const activePointerId = useRef<number | null>(null);
  const snapReady = motion.activeDropZone !== null;

  const clampRect = useCallback((r: FloatRect) => clampFloatRect(r), []);

  const updateDropFeedback = useCallback(
    (clientX: number, clientY: number) => {
      const hit = hitDockZone(clientX, clientY);
      motion.setDropTarget(hit.zone, hit.proximity);
    },
    [motion]
  );

  const trySnapToZone = useCallback(
    (clientX: number, clientY: number) => {
      const hit = hitDockZone(clientX, clientY);
      motion.setDropTarget(null, 0);
      motion.setDraggingTab(null);
      if (!hit.inside || !hit.zone) return false;
      onDock(hit.zone);
      return true;
    },
    [motion, onDock]
  );

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      setDragging(false);
      const next = floatRectFromRelease(tabId, {
        clientX,
        clientY,
        grabOffsetX: dragOrigin.current.grabOffsetX,
        grabOffsetY: dragOrigin.current.grabOffsetY,
      });
      onRectChange(clampRect(next));
      setDragOffset({ x: 0, y: 0 });
      if (!trySnapToZone(clientX, clientY)) {
        motion.setDraggingTab(null);
      }
    },
    [tabId, onRectChange, clampRect, trySnapToZone, motion]
  );

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    activePointerId.current = e.pointerId;
    dragOrigin.current = {
      x: e.clientX,
      y: e.clientY,
      rect,
      grabOffsetX: e.clientX - rect.x,
      grabOffsetY: e.clientY - rect.y,
    };
    setDragging(true);
    setDragOffset({ x: 0, y: 0 });
    motion.setDraggingTab(tabId);
    motion.setDockDrag(null);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      if (activePointerId.current !== e.pointerId) return;
      e.preventDefault();
      const dx = e.clientX - dragOrigin.current.x;
      const dy = e.clientY - dragOrigin.current.y;
      setDragOffset({ x: dx, y: dy });
      updateDropFeedback(e.clientX, e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      if (activePointerId.current !== e.pointerId) return;
      e.preventDefault();
      activePointerId.current = null;
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
  }, [dragging, updateDropFeedback, finishDrag]);

  useEffect(() => {
    dragOrigin.current = { ...dragOrigin.current, rect };
  }, [rect]);

  useEffect(() => {
    const onResize = () => onRectChange(clampRect(rect));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [rect, onRectChange, clampRect]);

  const displayX = dragging ? dragOrigin.current.rect.x + dragOffset.x : rect.x;
  const displayY = dragging ? dragOrigin.current.rect.y + dragOffset.y : rect.y;

  return createPortal(
    <div
      className={clsx(
        'floating-panel',
        dragging && 'floating-panel-dragging',
        snapReady && 'floating-panel--snap-ready'
      )}
      data-floating-tab={tabId}
      style={{
        left: displayX,
        top: displayY,
        width: rect.width,
        height: rect.height,
        zIndex,
      }}
      role="dialog"
      aria-label={`${title} (floating)`}
    >
      <div className="floating-panel-header" onPointerDown={onHeaderPointerDown}>
        <DockDragDots className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-xai-fg">{title}</span>
        <button
          type="button"
          className="icon-btn !h-7 !w-7"
          onClick={() => {
            const hit = hitDockZone(rect.x + rect.width / 2, rect.y + rect.height / 2);
            onDock(hit.zone ?? 'bottom');
          }}
          title="Dock panel"
          aria-label={`Dock ${title}`}
        >
          <PanelBottomClose className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className={clsx('floating-panel-body', dragging && 'floating-panel-body--dragging')}>
        {children}
      </div>
    </div>,
    document.body
  );
}