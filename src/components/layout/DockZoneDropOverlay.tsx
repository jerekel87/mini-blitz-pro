import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useDockMotion } from '../../context/DockMotionContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { DOCK_ZONE_META } from '../../lib/dockZones';
import { measureDockZones } from '../../lib/dockDropGeometry';
import type { DockZoneId } from '../../lib/workspaceLayout';

interface ZoneRect {
  zone: DockZoneId;
  top: number;
  left: number;
  width: number;
  height: number;
}

export function DockZoneDropOverlay() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { draggingTab, activeDropZone, dropProximity } = useDockMotion();
  const [rects, setRects] = useState<ZoneRect[]>([]);

  useEffect(() => {
    if (isMobile || !draggingTab) {
      setRects([]);
      return;
    }
    const measure = () => {
      setRects(
        measureDockZones().map((z) => ({
          zone: z.zone,
          top: z.top,
          left: z.left,
          width: z.width,
          height: z.height,
        }))
      );
    };
    measure();
    const id = window.setInterval(measure, 120);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [draggingTab, isMobile]);

  if (isMobile || !draggingTab || rects.length === 0) return null;

  return createPortal(
    <div className="dock-zone-overlay-root pointer-events-none" aria-hidden>
      {rects.map((r) => {
        const meta = DOCK_ZONE_META[r.zone];
        const active = activeDropZone === r.zone;
        const near = !active && dropProximity > 0.25;
        return (
          <div
            key={r.zone}
            className={clsx(
              'dock-zone-overlay-hint',
              active && 'dock-zone-overlay-hint--active',
              near && 'dock-zone-overlay-hint--near'
            )}
            style={{
              top: r.top,
              left: r.left,
              width: r.width,
              height: r.height,
            }}
          >
            <span className="dock-zone-overlay-label">{meta.shortLabel}</span>
          </div>
        );
      })}
    </div>,
    document.body
  );
}