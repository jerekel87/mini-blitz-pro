import clsx from 'clsx';
import { X } from 'lucide-react';
import { getFileIcon } from '../lib/fileTree';

interface EditorTabsProps {
  tabs: string[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export function EditorTabs({ tabs, activePath, onSelect, onClose }: EditorTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="editor-tab-row" role="tablist">
      {tabs.map((path) => {
        const name = path.split('/').pop() ?? path;
        const active = path === activePath;
        return (
          <div
            key={path}
            role="tab"
            aria-selected={active}
            className={clsx('editor-tab group', active ? 'editor-tab-active' : 'editor-tab-inactive')}
            onClick={() => onSelect(path)}
          >
            <span className="w-4 shrink-0 text-center text-2xs opacity-70">{getFileIcon(path)}</span>
            <span className="truncate">{name}</span>
            <button
              type="button"
              className="p-0.5 opacity-0 transition hover:text-xai-fg group-hover:opacity-100"
              style={{ opacity: active ? 1 : undefined }}
              onClick={(e) => {
                e.stopPropagation();
                onClose(path);
              }}
              aria-label={`Close ${path}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}