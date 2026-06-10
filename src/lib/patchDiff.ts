export interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  oldLine?: number;
  newLine?: number;
}

/** Simple line diff for review UI (not a full Myers implementation). */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  let oi = 0;
  let ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      result.push({
        type: 'context',
        content: oldLines[oi],
        oldLine: oi + 1,
        newLine: ni + 1,
      });
      oi++;
      ni++;
      continue;
    }

    const oldPeek = oi + 1 < oldLines.length ? oldLines[oi + 1] : null;
    const newPeek = ni + 1 < newLines.length ? newLines[ni + 1] : null;

    if (ni < newLines.length && (oi >= oldLines.length || newLines[ni] === oldPeek)) {
      result.push({ type: 'add', content: newLines[ni], newLine: ni + 1 });
      ni++;
    } else if (oi < oldLines.length && (ni >= newLines.length || oldLines[oi] === newPeek)) {
      result.push({ type: 'remove', content: oldLines[oi], oldLine: oi + 1 });
      oi++;
    } else if (oi < oldLines.length && ni < newLines.length) {
      result.push({ type: 'remove', content: oldLines[oi], oldLine: oi + 1 });
      result.push({ type: 'add', content: newLines[ni], newLine: ni + 1 });
      oi++;
      ni++;
    } else if (oi < oldLines.length) {
      result.push({ type: 'remove', content: oldLines[oi], oldLine: oi + 1 });
      oi++;
    } else {
      result.push({ type: 'add', content: newLines[ni], newLine: ni + 1 });
      ni++;
    }
  }

  return result;
}

export interface FilePatchDiff {
  path: string;
  isNew: boolean;
  isDeleted: boolean;
  oldContent: string;
  newContent: string;
  lines: DiffLine[];
  additions: number;
  deletions: number;
}

export function buildFileDiffs(
  before: Record<string, string>,
  patch: Record<string, string>
): FilePatchDiff[] {
  const paths = new Set([...Object.keys(before), ...Object.keys(patch)]);

  return [...paths]
    .filter((path) => before[path] !== patch[path])
    .sort()
    .map((path) => {
      const oldContent = before[path] ?? '';
      const newContent = patch[path] ?? '';
      const lines = computeLineDiff(oldContent, newContent);
      return {
        path,
        isNew: !(path in before),
        isDeleted: !(path in patch),
        oldContent,
        newContent,
        lines,
        additions: lines.filter((l) => l.type === 'add').length,
        deletions: lines.filter((l) => l.type === 'remove').length,
      };
    });
}