import type { BootStatus, FlatFiles, TemplateId } from '../types';
import type { DualRealityState } from './dualReality';

export type TimelineEventType =
  | 'session_start'
  | 'files_snapshot'
  | 'terminal'
  | 'boot_status'
  | 'dual_reality'
  | 'template_change'
  | 'ai_patch';

export interface TimelineEvent {
  id: string;
  ts: number;
  type: TimelineEventType;
  label: string;
  files?: FlatFiles;
  terminalChunk?: string;
  bootStatus?: BootStatus;
  dualReality?: Pick<DualRealityState, 'alignment' | 'label' | 'detail'>;
  templateId?: TemplateId;
}

export interface TimelineViewState {
  files: FlatFiles;
  terminal: string;
  bootStatus: BootStatus | null;
  dualReality: TimelineEvent['dualReality'] | null;
  eventLabel: string;
  eventIndex: number;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `ev-${idCounter}`;
}

function cloneFiles(files: FlatFiles): FlatFiles {
  return Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v]));
}

export class SessionTimelineStore {
  events: TimelineEvent[] = [];
  private terminalPending = '';
  private terminalFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFilesJson = '';

  get headIndex(): number {
    return Math.max(0, this.events.length - 1);
  }

  push(event: Omit<TimelineEvent, 'id' | 'ts'>): TimelineEvent {
    const full: TimelineEvent = {
      ...event,
      id: nextId(),
      ts: Date.now(),
    };
    this.events.push(full);
    return full;
  }

  startSession(templateId: TemplateId, files: FlatFiles): void {
    this.events = [];
    this.lastFilesJson = JSON.stringify(files);
    this.push({
      type: 'session_start',
      label: `Session started (${templateId})`,
      files: cloneFiles(files),
      templateId,
    });
  }

  recordTemplateChange(templateId: TemplateId, files: FlatFiles): void {
    this.lastFilesJson = JSON.stringify(files);
    this.push({
      type: 'template_change',
      label: `Template → ${templateId}`,
      files: cloneFiles(files),
      templateId,
    });
  }

  recordFilesSnapshot(files: FlatFiles, label: string): boolean {
    const json = JSON.stringify(files);
    if (json === this.lastFilesJson) return false;
    this.lastFilesJson = json;
    this.push({
      type: 'files_snapshot',
      label,
      files: cloneFiles(files),
    });
    return true;
  }

  recordTerminal(chunk: string): void {
    this.terminalPending += chunk;
    if (this.terminalFlushTimer) return;
    this.terminalFlushTimer = setTimeout(() => {
      this.terminalFlushTimer = null;
      const text = this.terminalPending;
      this.terminalPending = '';
      if (!text) return;
      const preview = text.replace(/\x1b\[[0-9;]*m/g, '').trim().slice(0, 60);
      this.push({
        type: 'terminal',
        label: preview ? `Terminal: ${preview}…` : 'Terminal output',
        terminalChunk: text,
      });
    }, 250);
  }

  flushTerminal(): void {
    if (this.terminalFlushTimer) {
      clearTimeout(this.terminalFlushTimer);
      this.terminalFlushTimer = null;
    }
    if (this.terminalPending) {
      const text = this.terminalPending;
      this.terminalPending = '';
      this.push({
        type: 'terminal',
        label: 'Terminal output',
        terminalChunk: text,
      });
    }
  }

  recordBootStatus(status: BootStatus): void {
    const last = this.events[this.events.length - 1];
    if (last?.type === 'boot_status' && last.bootStatus === status) return;
    this.push({
      type: 'boot_status',
      label: `Boot: ${status}`,
      bootStatus: status,
    });
  }

  recordAiPatch(summary: string, files: FlatFiles): void {
    this.lastFilesJson = JSON.stringify(files);
    this.push({
      type: 'ai_patch',
      label: summary.startsWith('AI:') ? summary : `AI: ${summary}`,
      files: cloneFiles(files),
    });
  }

  recordDualReality(state: DualRealityState): void {
    const last = this.events[this.events.length - 1];
    if (
      last?.type === 'dual_reality' &&
      last.dualReality?.alignment === state.alignment
    ) {
      return;
    }
    this.push({
      type: 'dual_reality',
      label: `Preview: ${state.label}`,
      dualReality: {
        alignment: state.alignment,
        label: state.label,
        detail: state.detail,
      },
    });
  }

  getViewState(index: number): TimelineViewState {
    const idx = Math.max(0, Math.min(index, this.events.length - 1));
    let files: FlatFiles = {};
    let terminal = '';
    let bootStatus: BootStatus | null = null;
    let dualReality: TimelineEvent['dualReality'] | null = null;

    for (let i = 0; i <= idx; i++) {
      const ev = this.events[i];
      if (ev.files) files = cloneFiles(ev.files);
      if (ev.terminalChunk) terminal += ev.terminalChunk;
      if (ev.bootStatus) bootStatus = ev.bootStatus;
      if (ev.dualReality) dualReality = ev.dualReality;
    }

    return {
      files,
      terminal,
      bootStatus,
      dualReality,
      eventLabel: this.events[idx]?.label ?? '',
      eventIndex: idx,
    };
  }

  formatTime(ts: number, startTs: number): string {
    const sec = Math.floor((ts - startTs) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get sessionStartTs(): number {
    return this.events[0]?.ts ?? Date.now();
  }
}

export function describeFileChange(path: string | null): string {
  if (!path) return 'Project files updated';
  return `Edited ${path}`;
}