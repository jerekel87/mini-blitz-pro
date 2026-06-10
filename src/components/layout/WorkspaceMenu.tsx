import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import type { PreviewLaneVisibility } from '../../lib/workspaceLayout';

interface WorkspaceMenuProps {
  preview: PreviewLaneVisibility;
  panels: { explorer: boolean; preview: boolean; parallelLab: boolean };
  onPreviewChange: (patch: Partial<PreviewLaneVisibility>) => void;
  onPanelChange: (panel: 'explorer' | 'preview' | 'parallelLab', visible: boolean) => void;
  onReset: () => void;
}

export function WorkspaceMenu({
  preview,
  panels,
  onPreviewChange,
  onPanelChange,
  onReset,
}: WorkspaceMenuProps) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPopoverPos(null);
      return;
    }
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const popover = document.getElementById('workspace-menu-popover');
      if (popover?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const popover =
    open && popoverPos
      ? createPortal(
          <div
            id="workspace-menu-popover"
            className="workspace-menu-popover fixed z-[200] w-[17.5rem] border border-xai-border-subtle bg-xai-raised p-3 shadow-xl"
            style={{ top: popoverPos.top, right: popoverPos.right }}
            role="menu"
          >
            <p className="text-2xs font-semibold uppercase tracking-wider text-xai-muted">Panels</p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 py-1.5 text-sm text-xai-fg">
              <input
                type="checkbox"
                checked={panels.explorer}
                onChange={(e) => onPanelChange('explorer', e.target.checked)}
                className="accent-white"
              />
              File explorer
            </label>
            <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-xai-fg">
              <input
                type="checkbox"
                checked={panels.preview}
                onChange={(e) => onPanelChange('preview', e.target.checked)}
                className="accent-white"
              />
              Preview column
            </label>
            <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-xai-fg">
              <input
                type="checkbox"
                checked={panels.parallelLab}
                onChange={(e) => onPanelChange('parallelLab', e.target.checked)}
                className="accent-white"
              />
              Parallel lab controls
            </label>
            <p className="mt-1 text-2xs leading-relaxed text-xai-muted">
              Hides universe fork UI only. Preview iframes stay unless you turn lanes off below.
            </p>

            <p className="mt-4 text-2xs font-semibold uppercase tracking-wider text-xai-muted">
              Preview lanes
            </p>
            <p className="mt-1 text-2xs leading-relaxed text-xai-muted">
              Instant = quick draft. Truth = full Vite app with Tailwind.
            </p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 py-1.5 text-sm text-xai-fg">
              <input
                type="checkbox"
                checked={preview.instantA}
                onChange={(e) => onPreviewChange({ instantA: e.target.checked })}
                className="accent-white"
              />
              Universe A (instant)
            </label>
            <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-xai-fg">
              <input
                type="checkbox"
                checked={preview.instantB}
                onChange={(e) => onPreviewChange({ instantB: e.target.checked })}
                className="accent-white"
              />
              Universe B (instant)
            </label>
            <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-xai-fg">
              <input
                type="checkbox"
                checked={preview.truth}
                onChange={(e) => onPreviewChange({ truth: e.target.checked })}
                className="accent-white"
              />
              Truth (WebContainer)
            </label>

            <button
              type="button"
              className="btn-ghost mt-4 w-full !justify-center !text-xs"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset workspace layout
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={clsx('btn-ghost', open && 'bg-xai-overlay text-xai-fg')}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        title="Workspace layout"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden md:inline">Workspace</span>
      </button>
      {popover}
    </div>
  );
}