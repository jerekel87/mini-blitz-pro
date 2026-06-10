/** Snap preview-reported locations onto real JSX/source lines in the editor. */

export interface DomHint {
  tag: string;
  className?: string;
  text?: string;
}

/** Prefer matching JSX from what was clicked; fall back to React debug line. */
export function resolveNavigateLocation(
  content: string,
  line: number,
  column: number,
  dom?: DomHint | null
): { line: number; column: number } {
  if (dom?.tag) {
    const fromDom = findJsxLineForDom(content, dom, line);
    if (fromDom) return fromDom;
  }
  return snapSourceLocation(content, line, column);
}

function findJsxLineForDom(
  content: string,
  dom: DomHint,
  hintLine?: number
): { line: number; column: number } | null {
  const lines = content.split('\n');
  const tag = dom.tag.toLowerCase();
  const classes = (dom.className ?? '').split(/\s+/).filter((c) => c.length > 2);
  const text = (dom.text ?? '').replace(/\s+/g, ' ').trim();

  type Candidate = { line: number; column: number; score: number };
  const candidates: Candidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    const chunk = [lines[i], lines[i + 1], lines[i + 2]].filter(Boolean).join(' ');
    const openTag = new RegExp(`<${tag}[\\s>/]`, 'i');
    if (!openTag.test(chunk)) continue;

    let score = 5;
    for (const cls of classes) {
      if (chunk.includes(cls)) score += 12;
    }
    if (text.length >= 2) {
      if (chunk.includes(text)) score += 28;
      else if (lines[i + 1]?.includes(text) || lines[i + 2]?.includes(text)) score += 22;
    }
    if (tag === 'button' && /onClick|type=["']button/.test(chunk)) score += 10;
    if (tag === 'main' && /min-h-screen|className/.test(chunk)) score += 6;
    if (tag === 'p' && /^\d+$/.test(text) && chunk.includes('{count}')) score += 30;
    if (hintLine && Math.abs(i + 1 - hintLine) <= 2) score += 2;

    const tagMatch = lines[i].match(new RegExp(`<${tag}`, 'i'));
    const col = tagMatch && tagMatch.index !== undefined ? tagMatch.index + 1 : 1;
    candidates.push({ line: i + 1, column: col, score });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  if (candidates[0].score < 10) return null;
  return { line: candidates[0].line, column: candidates[0].column };
}

export function snapSourceLocation(
  content: string,
  line: number,
  column: number
): { line: number; column: number } {
  const lines = content.split('\n');
  const lineCount = Math.max(1, lines.length);
  let L = Math.min(Math.max(1, Math.floor(line) || 1), lineCount);
  let C = Math.max(1, Math.floor(column) || 1);

  const isUsefulLine = (text: string): boolean => {
    const t = text.trim();
    if (!t) return false;
    if (/^[})\];,]+$/.test(t)) return false;
    if (t === '}' || t === ');' || t === ');') return false;
    return (
      /<[\w.-]/.test(t) ||
      /\breturn\b/.test(t) ||
      /className=|onClick=|style=|type=/.test(t) ||
      (t.includes('{') && t.length > 2)
    );
  };

  while (L > 1 && !isUsefulLine(lines[L - 1] ?? '')) {
    L -= 1;
  }

  const text = lines[L - 1] ?? '';
  if (!isUsefulLine(text) && L < lineCount) {
    for (let i = L + 1; i <= lineCount; i++) {
      if (isUsefulLine(lines[i - 1] ?? '')) {
        L = i;
        break;
      }
    }
  }

  const lineText = lines[L - 1] ?? '';
  const maxCol = Math.max(1, lineText.length + 1);
  C = Math.min(C, maxCol);

  const tagAt = lineText.match(/<[\w.-]+/);
  const attrAt = lineText.match(/[a-zA-Z][\w-]*\s*=/);
  if (tagAt && tagAt.index !== undefined) {
    C = tagAt.index + 1;
  } else if (attrAt && attrAt.index !== undefined) {
    C = attrAt.index + 1;
  } else {
    const firstNonWs = lineText.search(/\S/);
    C = firstNonWs >= 0 ? firstNonWs + 1 : 1;
  }

  return { line: L, column: C };
}