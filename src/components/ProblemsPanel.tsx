import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';

export interface Problem {
  id: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  type?: 'error' | 'warning';
}

interface ProblemsPanelProps {
  problems: Problem[];
  onSelect?: (problem: Problem) => void;
  onClear?: () => void;
  embedded?: boolean;
}

export function ProblemsPanel({ problems, onSelect, onClear, embedded = false }: ProblemsPanelProps) {
  if (problems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-white/40">
        No problems detected. Errors from the dev server, AI, and previews will appear here.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#111] text-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs font-medium text-white/70">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          PROBLEMS ({problems.length})
        </div>
        {onClear && (
          <button onClick={onClear} className="text-white/40 hover:text-white" title="Clear all">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1 text-xs">
        {problems.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelect?.(p)}
            className={clsx(
              'flex cursor-pointer items-start gap-2 rounded border border-white/10 bg-white/5 p-2 hover:bg-white/10',
              p.type === 'warning' ? 'border-yellow-500/30' : 'border-red-500/30'
            )}
          >
            <AlertTriangle className={clsx('mt-0.5 h-3.5 w-3.5 shrink-0', p.type === 'warning' ? 'text-yellow-400' : 'text-red-400')} />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-white/90 break-words">{p.message}</div>
              {p.file && (
                <div className="mt-0.5 text-[10px] text-white/50 truncate">
                  {p.file}{p.line != null ? `:${p.line}` : ''}{p.column != null ? `:${p.column}` : ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
