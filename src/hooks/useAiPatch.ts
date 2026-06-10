import { useCallback, useState } from 'react';
import {
  generateAiPatch,
  mergePatch,
  validatePatch,
  type AiPatchProposal,
} from '../lib/aiPatch';
import { buildFileDiffs, type FilePatchDiff } from '../lib/patchDiff';
import type { FlatFiles, TemplateId } from '../types';

export type AiPatchStatus = 'idle' | 'generating' | 'review' | 'applying' | 'error';

interface UseAiPatchOptions {
  files: FlatFiles;
  activePath: string | null;
  templateId: TemplateId;
  disabled?: boolean;
  onApply: (merged: FlatFiles, changedPaths: string[]) => Promise<void>;
  onRollback: (previous: FlatFiles) => Promise<void>;
  onRecordTimeline: (summary: string, merged: FlatFiles) => void;
}

export function useAiPatch({
  files,
  activePath,
  templateId,
  disabled = false,
  onApply,
  onRollback,
  onRecordTimeline,
}: UseAiPatchOptions) {
  const [status, setStatus] = useState<AiPatchStatus>('idle');
  const [prompt, setPrompt] = useState('');
  const [proposal, setProposal] = useState<AiPatchProposal | null>(null);
  const [diffs, setDiffs] = useState<FilePatchDiff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mergedPreview, setMergedPreview] = useState<FlatFiles | null>(null);
  const [applyNotice, setApplyNotice] = useState<string | null>(null);

  const generate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('Describe the change you want');
      return;
    }
    if (disabled) {
      setError('Return to live before using AI Surgeon');
      return;
    }

    setStatus('generating');
    setError(null);
    setProposal(null);
    setDiffs([]);
    setMergedPreview(null);
    setApplyNotice(null);

    try {
      const result = await generateAiPatch({
        prompt: trimmed,
        files,
        activePath,
        templateId,
      });

      const validationError = validatePatch(files, result.files);
      if (validationError) throw new Error(validationError);

      const merged = mergePatch(files, result.files);
      const fileDiffs = buildFileDiffs(files, merged);

      if (fileDiffs.length === 0) {
        throw new Error('AI proposed no effective changes');
      }

      setProposal(result);
      setMergedPreview(merged);
      setDiffs(fileDiffs);
      setStatus('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [prompt, files, activePath, templateId, disabled]);

  const reject = useCallback(() => {
    setProposal(null);
    setDiffs([]);
    setMergedPreview(null);
    setError(null);
    setApplyNotice(null);
    setStatus('idle');
  }, []);

  const apply = useCallback(async () => {
    if (!proposal || !mergedPreview) return;

    const validationError = validatePatch(files, proposal.files);
    if (validationError) {
      setError(validationError);
      setStatus('error');
      return;
    }

    const changedPaths = Object.keys(mergedPreview).filter(
      (p) => mergedPreview[p] !== files[p]
    );
    if (changedPaths.length === 0) {
      setError('No file changes to apply');
      setStatus('error');
      return;
    }

    const snapshot = { ...files };
    setStatus('applying');
    setError(null);
    setApplyNotice(null);

    try {
      await onApply(mergedPreview, changedPaths);
      onRecordTimeline(`AI: ${proposal.summary}`, mergedPreview);
      setProposal(null);
      setDiffs([]);
      setMergedPreview(null);
      setPrompt('');
      setStatus('idle');
      setApplyNotice(
        `Applied to ${changedPaths.length} file(s): ${changedPaths.join(', ')}. Check the Truth preview (and Instant lane) — changes target the project inside WebContainer, not the Grok Build IDE chrome.`
      );
    } catch (e) {
      try {
        await onRollback(snapshot);
      } catch {
        /* rollback failed */
      }
      setError(
        `Apply failed — rolled back. ${e instanceof Error ? e.message : String(e)}`
      );
      setStatus('error');
    }
  }, [proposal, mergedPreview, files, onApply, onRollback, onRecordTimeline]);

  return {
    status,
    prompt,
    setPrompt,
    proposal,
    diffs,
    error,
    mergedPreview,
    applyNotice,
    generate,
    apply,
    reject,
    isBusy: status === 'generating' || status === 'applying',
  };
}