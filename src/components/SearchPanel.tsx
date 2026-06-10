import React, { useState, useMemo, useCallback } from 'react';
import { Search, Replace, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { FlatFiles } from '../types';

interface SearchMatch {
  path: string;
  line: number;
  column: number;
  text: string;
  match: string;
  length: number;
}

interface SearchOptions {
  caseSensitive: boolean;
  regex: boolean;
  wholeWord: boolean;
}

interface SearchPanelProps {
  files: FlatFiles;
  onOpenFile: (path: string, line?: number, column?: number) => void;
  onFilesChanged: (newFiles: FlatFiles) => void;
  embedded?: boolean;
}

export function SearchPanel({ files, onOpenFile, onFilesChanged, embedded = false }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    regex: false,
    wholeWord: false,
  });
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [replacing, setReplacing] = useState(false);

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const matches = useMemo((): SearchMatch[] => {
    if (!query.trim()) return [];
    const results: SearchMatch[] = [];
    const flags = options.caseSensitive ? 'g' : 'gi';
    let pattern: RegExp;

    try {
      if (options.regex) {
        pattern = new RegExp(query, flags);
      } else {
        let q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (options.wholeWord) q = `\\b${q}\\b`;
        pattern = new RegExp(q, flags);
      }
    } catch {
      return [];
    }

    Object.entries(files).forEach(([path, content]) => {
      if (!content) return;
      const lines = content.split('\n');
      lines.forEach((lineText, lineIdx) => {
        let match: RegExpExecArray | null;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(lineText)) !== null) {
          results.push({
            path,
            line: lineIdx + 1,
            column: match.index + 1,
            text: lineText,
            match: match[0],
            length: match[0].length,
          });
          if (!options.regex || !match[0]) break; // avoid infinite for non-global or empty
        }
      });
    });
    return results;
  }, [files, query, options]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchMatch[]>();
    matches.forEach((m) => {
      if (!map.has(m.path)) map.set(m.path, []);
      map.get(m.path)!.push(m);
    });
    return Array.from(map.entries());
  }, [matches]);

  const totalMatches = matches.length;

  const toggleFile = (path: string) => {
    const next = new Set(expandedFiles);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedFiles(next);
  };

  const handleOpen = (m: SearchMatch) => {
    onOpenFile(m.path, m.line, m.column);
  };

  const performReplace = useCallback((specificMatch?: SearchMatch) => {
    if (!query || !replaceText) return;
    setReplacing(true);

    const newFiles: FlatFiles = { ...files };
    let changed = 0;

    Object.keys(files).forEach((path) => {
      let content = newFiles[path];
      if (!content) return;

      const flags = options.caseSensitive ? 'g' : 'gi';
      let pattern: RegExp;
      try {
        if (options.regex) {
          pattern = new RegExp(query, flags);
        } else {
          let q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (options.wholeWord) q = `\\b${q}\\b`;
          pattern = new RegExp(q, flags);
        }
      } catch {
        return;
      }

      const original = content;
      content = content.replace(pattern, replaceText);
      if (content !== original) {
        newFiles[path] = content;
        changed += (original.match(pattern) || []).length;
      }
    });

    if (changed > 0) {
      onFilesChanged(newFiles);
    }
    setReplacing(false);
    // Optionally clear or keep query
  }, [files, query, replaceText, options, onFilesChanged]);

  const handleReplaceAll = () => performReplace();

  // For single match replace, we can implement per-match but for simplicity global first
  const handleReplaceInFile = (path: string) => {
    if (!query || !replaceText) return;
    const content = files[path];
    if (!content) return;

    const flags = options.caseSensitive ? 'g' : 'gi';
    let pattern: RegExp;
    try {
      if (options.regex) {
        pattern = new RegExp(query, flags);
      } else {
        let q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (options.wholeWord) q = `\\b${q}\\b`;
        pattern = new RegExp(q, flags);
      }
    } catch {
      return;
    }

    const newContent = content.replace(pattern, replaceText);
    if (newContent !== content) {
      const next = { ...files, [path]: newContent };
      onFilesChanged(next);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#111] text-sm">
      <div className="border-b border-white/10 p-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find in files..."
              className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 text-xs pl-7"
            />
            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-white/50" />
          </div>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace with..."
            className="flex-1 rounded bg-black/40 border border-white/10 px-2 py-1 text-xs"
          />
          <button
            onClick={handleReplaceAll}
            disabled={!query || !replaceText || replacing}
            className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
            title="Replace all matches"
          >
            <Replace className="h-3 w-3" /> All
          </button>
        </div>

        <div className="mt-1.5 flex gap-3 text-[10px] text-white/60">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={options.caseSensitive}
              onChange={(e) => setOptions((o) => ({ ...o, caseSensitive: e.target.checked }))}
            />
            Aa
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={options.regex}
              onChange={(e) => setOptions((o) => ({ ...o, regex: e.target.checked }))}
            />
            .*
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={options.wholeWord}
              onChange={(e) => setOptions((o) => ({ ...o, wholeWord: e.target.checked }))}
            />
            \b
          </label>
          <div className="ml-auto text-white/50">{totalMatches} matches</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-1 text-xs">
        {grouped.length === 0 && query && (
          <div className="p-2 text-white/40">No matches for “{query}”</div>
        )}
        {grouped.map(([path, ms]) => {
          const isOpen = expandedFiles.has(path) || expandedFiles.size === 0;
          return (
            <div key={path} className="mb-0.5">
              <button
                onClick={() => toggleFile(path)}
                className="flex w-full items-center gap-1 px-1 py-0.5 text-left hover:bg-white/5 rounded text-white/80"
              >
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span className="font-mono truncate">{path}</span>
                <span className="ml-1 text-[10px] text-white/50">({ms.length})</span>
              </button>
              {isOpen && (
                <div className="pl-4 space-y-0.5">
                  {ms.map((m, idx) => {
                    const before = m.text.slice(0, m.column - 1);
                    const after = m.text.slice(m.column - 1 + m.length);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleOpen(m)}
                        className="w-full text-left px-1 py-0.5 hover:bg-white/5 rounded font-mono text-[10px] flex items-baseline gap-1.5"
                      >
                        <span className="text-white/50 w-8 shrink-0 text-right">{m.line}</span>
                        <span className="truncate text-white/70">
                          {before}
                          <mark className="bg-xai-accent/30 text-white rounded px-0.5">{m.match}</mark>
                          {after}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReplaceInFile(m.path); }}
                          className="ml-auto text-[9px] px-1 text-white/50 hover:text-white"
                          title="Replace this occurrence"
                        >
                          <Replace className="h-3 w-3" />
                        </button>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handleReplaceInFile(path)}
                    className="text-[10px] text-white/50 hover:text-white pl-1"
                  >
                    Replace in this file
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 p-2 text-[10px] text-white/40">
        Search across all files. Replace updates the project files (use with care; no undo beyond timeline).
      </div>
    </div>
  );
}


