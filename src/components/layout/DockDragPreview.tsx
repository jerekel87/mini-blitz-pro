import { createPortal } from 'react-dom';
import { useDockMotion } from '../../context/DockMotionContext';
import { DockDragDots } from './DockDragDots';

/** Live panel chrome that follows the pointer while pulling out of the dock. */
export function DockDragPreview() {
  const { dockDrag } = useDockMotion();
  if (!dockDrag) return null;

  return createPortal(
    <div
      className="dock-drag-preview floating-panel floating-panel-dragging pointer-events-none"
      style={{
        left: dockDrag.x,
        top: dockDrag.y,
        width: dockDrag.width,
        height: dockDrag.height,
        zIndex: 220,
      }}
      aria-hidden
    >
      <div className="floating-panel-header">
        <DockDragDots className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-xai-fg">
          {dockDrag.label}
        </span>
      </div>
      <div className="dock-drag-preview-body" />
    </div>,
    document.body
  );
}