import type { FileSystemTree } from '@webcontainer/api';
import type { FileNode, FlatFiles } from '../types';

export function flatToTree(files: FlatFiles): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [filePath, content] of Object.entries(files)) {
    const parts = filePath.split('/').filter(Boolean);
    let current = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const existing = current[part];
      if (!existing || !('directory' in existing)) {
        current[part] = { directory: {} };
      }
      current = (current[part] as { directory: FileSystemTree }).directory;
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = { file: { contents: content } };
  }

  return tree;
}

export function treeToFlat(tree: FileSystemTree, base = ''): FlatFiles {
  const files: FlatFiles = {};

  for (const [name, node] of Object.entries(tree)) {
    const path = base ? `${base}/${name}` : name;
    if ('file' in node && 'contents' in node.file) {
      const contents = node.file.contents;
      files[path] = typeof contents === 'string' ? contents : new TextDecoder().decode(contents);
    } else if ('directory' in node) {
      Object.assign(files, treeToFlat(node.directory, path));
    } else if ('symlink' in node) {
      /* skip symlinks */
    }
  }

  return files;
}

export function buildFileNodes(files: FlatFiles): FileNode[] {
  const root: FileNode = { name: '', path: '', type: 'directory', children: [] };

  for (const path of Object.keys(files).sort()) {
    const parts = path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join('/');

      if (!current.children) current.children = [];

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: fullPath,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
        };
        current.children.push(child);
      }
      if (!isFile) current = child;
    }
  }

  return sortNodes(root.children ?? []);
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return nodes
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((n) => ({
      ...n,
      children: n.children ? sortNodes(n.children) : undefined,
    }));
}

export function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    html: 'html',
    css: 'css',
    scss: 'scss',
    js: 'javascript',
    mjs: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    svg: 'xml',
  };
  return map[ext] ?? 'plaintext';
}

export function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const icons: Record<string, string> = {
    html: '🌐',
    css: '🎨',
    js: '📜',
    jsx: '⚛️',
    ts: '📘',
    tsx: '⚛️',
    json: '{}',
    md: '📝',
  };
  return icons[ext] ?? '📄';
}