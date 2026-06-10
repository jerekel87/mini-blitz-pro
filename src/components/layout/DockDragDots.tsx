import clsx from 'clsx';

/** 2×2 drag affordance (replaces 6-dot grip). */
export function DockDragDots({ className }: { className?: string }) {
  return (
    <span className={clsx('dock-drag-dots', className)} aria-hidden>
      <span className="dock-drag-dot" />
      <span className="dock-drag-dot" />
      <span className="dock-drag-dot" />
      <span className="dock-drag-dot" />
    </span>
  );
}