import { useMemo, useState } from 'react';
import {
  Sparkles,
  Settings,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  FileCode2,
} from 'lucide-react';
import clsx from 'clsx';
import type { useAiPatch } from '../hooks/useAiPatch';
import type { FilePatchDiff } from '../lib/patchDiff';
import {
  GROK_PRESET,
  loadAiSettings,
  providerLabel,
  saveAiSettings,
  usesDevProxy,
  type AiSettings,
} from '../lib/aiSettings';

type AiPatch = ReturnType<typeof useAiPatch>;

interface AiPatchPanelProps {
  ai: AiPatch;
  embedded?: boolean;
}

function PatchFileDiff({ diff }: { diff: FilePatchDiff }) {
  const [open, setOpen] = useState(true);

  return (
    <article className="patch-file">
      <button
        type="button"
        className="patch-file-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-xai-muted" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-xai-muted" />
        )}
        <FileCode2 className="h-3.5 w-3.5 shrink-0 text-xai-muted" />
        <span className="patch-file-path truncate">{diff.path}</span>
        {diff.isNew && <span className="patch-file-badge">New</span>}
        <span className="patch-file-stats">
          <span className="patch-stat-add">+{diff.additions}</span>
          {' '}
          <span className="patch-stat-del">−{diff.deletions}</span>
        </span>
      </button>
      {open && (
        <div className="patch-file-body">
          {diff.lines.map((line, i) => (
            <div
              key={i}
              className={clsx(
                'patch-line',
                line.type === 'add' && 'patch-line-add',
                line.type === 'remove' && 'patch-line-remove',
                line.type === 'context' && 'patch-line-context'
              )}
            >
              <span className="patch-line-sign">
                {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
              </span>
              <span className="patch-line-content">{line.content || ' '}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<AiSettings>(loadAiSettings);

  const save = () => {
    saveAiSettings(form);
    onClose();
  };

  return (
    <div
      className="modal-scrim absolute inset-0 z-20 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md border border-xai-border bg-xai-raised p-6 shadow-float">
        <h3 className="text-sm font-semibold tracking-tight text-xai-fg">Ask Jeremy settings</h3>
        <p className="mt-2 text-xs leading-relaxed text-xai-muted">
          OpenAI-compatible API. Keys stay in localStorage. Grok and OpenAI use the local dev proxy
          (no browser CORS). Run via <code className="font-mono text-[11px] text-xai-secondary">npm run dev</code>.
        </p>
        <button
          type="button"
          className="mt-3 text-xs text-xai-fg underline-offset-2 hover:underline"
          onClick={() => setForm({ ...form, ...GROK_PRESET, apiKey: form.apiKey })}
        >
          Apply Grok preset (api.x.ai)
        </button>
        {usesDevProxy(form.baseUrl) && (
          <p className="mt-2 text-xs text-xai-success">
            {providerLabel(form.baseUrl)} → proxied through this dev server
          </p>
        )}
        <label className="mt-4 block text-xs font-medium text-xai-secondary">API key</label>
        <input
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
          className="input-field mt-1.5 font-mono text-xs"
          placeholder="sk-…"
        />
        <label className="mt-3 block text-xs font-medium text-xai-secondary">Base URL</label>
        <input
          type="url"
          value={form.baseUrl}
          onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
          className="input-field mt-1.5 font-mono text-xs"
        />
        <label className="mt-3 block text-xs font-medium text-xai-secondary">Model</label>
        <input
          type="text"
          value={form.model}
          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
          className="input-field mt-1.5 font-mono text-xs"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function AiPatchPanel({ ai, embedded = false }: AiPatchPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasKey = !!loadAiSettings().apiKey;

  const totals = useMemo(() => {
    return ai.diffs.reduce(
      (acc, d) => ({
        additions: acc.additions + d.additions,
        deletions: acc.deletions + d.deletions,
      }),
      { additions: 0, deletions: 0 }
    );
  }, [ai.diffs]);

  const showCompose = ai.status === 'idle' || ai.status === 'error' || ai.status === 'generating';

  return (
    <div className="surgeon-panel relative">
      {!embedded && (
        <div className="panel-header gap-2">
          <Sparkles className="h-4 w-4 text-xai-fuchsia" />
          <span className="panel-title">Ask Jeremy</span>
          <button
            type="button"
            className="icon-btn ml-auto"
            onClick={() => setSettingsOpen(true)}
            title="API settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      )}

      {showCompose && (
        <div className="surgeon-compose">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-xai-muted">
              Describe a surgical change — minimal diff, review before apply.
            </p>
            {embedded && (
              <button
                type="button"
                className="icon-btn shrink-0"
                onClick={() => setSettingsOpen(true)}
                title="API settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>

          {!hasKey && (
            <p className="border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
              Add an API key in settings (or set <span className="font-mono">VITE_AI_API_KEY</span>).
            </p>
          )}

          <textarea
            value={ai.prompt}
            onChange={(e) => ai.setPrompt(e.target.value)}
            disabled={ai.isBusy || ai.status === 'review'}
            placeholder="e.g. Add a dark mode toggle to App.tsx"
            className="input-field resize-none text-sm disabled:opacity-50"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && ai.status === 'idle') {
                e.preventDefault();
                ai.generate();
              }
            }}
          />

          <p className="surgeon-hint">
            <kbd>⌘</kbd> + <kbd>Enter</kbd> to generate
          </p>

          {(ai.status === 'idle' || ai.status === 'error') && (
            <button
              type="button"
              className="btn-primary w-full justify-center"
              onClick={ai.generate}
              disabled={!hasKey || ai.isBusy}
            >
              {ai.isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate patch
            </button>
          )}

          {ai.status === 'generating' && (
            <div className="flex items-center gap-2.5 py-1 text-sm text-xai-muted">
              <Loader2 className="h-4 w-4 animate-spin text-xai-fuchsia" />
              Generating surgical patch…
            </div>
          )}

          {ai.error && (
            <pre className="overflow-auto border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs leading-relaxed text-red-300 whitespace-pre-wrap">
              {ai.error}
            </pre>
          )}

          {ai.applyNotice && (
            <p className="border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs leading-relaxed text-emerald-100/90">
              {ai.applyNotice}
            </p>
          )}
        </div>
      )}

      {ai.status === 'review' && ai.proposal && (
        <div className="patch-review">
          <header className="patch-review-header">
            <p className="patch-review-eyebrow">Proposed patch</p>
            <p className="patch-review-summary">{ai.proposal.summary}</p>
            <div className="patch-stats">
              <span className="patch-stat">
                {ai.diffs.length} file{ai.diffs.length !== 1 ? 's' : ''}
              </span>
              <span className="patch-stat patch-stat-add">+{totals.additions} lines</span>
              <span className="patch-stat patch-stat-del">−{totals.deletions} lines</span>
            </div>
          </header>

          <div className="patch-diff-list">
            {ai.diffs.map((d) => (
              <PatchFileDiff key={d.path} diff={d} />
            ))}
          </div>

          <footer className="patch-review-actions">
            <button
              type="button"
              className="btn-reject"
              onClick={ai.reject}
              disabled={ai.isBusy}
            >
              <X className="h-4 w-4" />
              Reject
            </button>
            <button
              type="button"
              className="btn-apply"
              onClick={ai.apply}
              disabled={ai.isBusy}
            >
              {ai.isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Apply patch to workspace
            </button>
          </footer>
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}