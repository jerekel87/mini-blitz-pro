import type { FileSystemTree } from '@webcontainer/api';

export type TemplateId = 'react-vite-tailwind' | 'react-vite' | 'vanilla-vite';

export interface ProjectTemplate {
  id: TemplateId;
  name: string;
  description: string;
  files: Record<string, string>;
}

export type BootStatus =
  | 'idle'
  | 'booting'
  | 'mounting'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export type FlatFiles = Record<string, string>;

export { FileSystemTree };