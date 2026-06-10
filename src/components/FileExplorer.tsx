import { useState } from 'react';
import { ChevronRight, FilePlus, Folder, FolderOpen } from 'lucide-react';
import clsx from 'clsx';
import { buildFileNodes, getFileIcon } from '../lib/fileTree';
import type { FileNode, FlatFiles } from '../types';

interface FileExplorerProps {
  files: FlatFiles;
  activePath: string | null;
  onSelect: (path: string) => void;
  onCreateFile?: (path: string) => void;
  divergedPaths?: string[];
}

const TREE_INDENT = 14;
const TREE_BASE = 16;

function FileTreeItem({
  node,
  depth,
  activePath,
  onSelect,
  divergedSet,
}: {
  node: FileNode;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
  divergedSet: Set<string>;
}) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === 'directory') {
    return (
      <div>
        <button
          type="button"
          className="tree-row"
          style={{ paddingLeft: `${TREE_BASE + depth * TREE_INDENT}px` }}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronRight
            className={clsx('h-3.5 w-3.5 shrink-0 text-xai-muted transition-transform duration-150', open && 'rotate-90')}
          />
          {open ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-xai-muted" strokeWidth={1.5} />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-xai-muted" strokeWidth={1.5} />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onSelect={onSelect}
              divergedSet={divergedSet}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={clsx('tree-row', activePath === node.path && 'tree-row-active')}
      style={{ paddingLeft: `${TREE_BASE + 18 + depth * TREE_INDENT}px` }}
      onClick={() => onSelect(node.path)}
    >
      <span className="w-4 shrink-0 text-center text-2xs opacity-80">{getFileIcon(node.path)}</span>
      <span className="truncate">{node.name}</span>
      {divergedSet.has(node.path) && (
        <span
          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-xai-fuchsia"
          title="Differs in Universe B"
        />
      )}
    </button>
  );
}

export function FileExplorer({ files, activePath, onSelect, onCreateFile, divergedPaths }: FileExplorerProps) {
  const nodes = buildFileNodes(files);
  const divergedSet = new Set(divergedPaths ?? []);

  const handleNewFile = () => {
    const name = window.prompt('New file path (e.g. src/Hello.tsx)');
    if (name?.trim()) onCreateFile?.(name.trim().replace(/^\/+/, ''));
  };

  return (
    <div className="flex h-full min-w-[12rem] flex-col bg-xai-surface">
      <div className="panel-header">
        <span className="panel-title">Explorer</span>
        {onCreateFile && (
          <button type="button" className="icon-btn" onClick={handleNewFile} title="New file">
            <FilePlus className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav
        className="flex-1 overflow-y-auto px-2 py-3.5"
        aria-label="Project files"
      >
        {nodes.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            depth={0}
            activePath={activePath}
            onSelect={onSelect}
            divergedSet={divergedSet}
          />
        ))}
      </nav>
    </div>
  );
}