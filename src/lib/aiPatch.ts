import type { FlatFiles, TemplateId } from '../types';
import { loadAiSettings, resolveChatEndpoint, usesDevProxy } from './aiSettings';

export interface AiPatchProposal {
  summary: string;
  files: FlatFiles;
}

const MAX_FILE_CHARS = 12_000;
const MAX_TOTAL_CHARS = 90_000;

function truncateForContext(content: string, max: number): string {
  if (content.length <= max) return content;
  const half = Math.floor(max / 2);
  return `${content.slice(0, half)}\n/* … truncated … */\n${content.slice(-half)}`;
}

function buildProjectContext(files: FlatFiles, activePath: string | null): string {
  const paths = Object.keys(files).sort();
  let total = 0;
  const parts: string[] = [];

  for (const path of paths) {
    let body = files[path];
    const room = MAX_TOTAL_CHARS - total;
    if (room <= 0) break;
    body = truncateForContext(body, Math.min(MAX_FILE_CHARS, room));
    total += body.length;
    const marker = path === activePath ? ' (active)' : '';
    parts.push(`### ${path}${marker}\n\`\`\`\n${body}\n\`\`\``);
  }

  return parts.join('\n\n');
}

function parseProposalJson(raw: string): AiPatchProposal {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  const parsed = JSON.parse(text) as { summary?: string; files?: FlatFiles };
  if (!parsed.files || typeof parsed.files !== 'object') {
    throw new Error('AI response missing "files" object');
  }

  const files: FlatFiles = {};
  for (const [path, content] of Object.entries(parsed.files)) {
    if (typeof content !== 'string') continue;
    files[path.replace(/^\/+/, '')] = content;
  }

  if (Object.keys(files).length === 0) {
    throw new Error('AI returned no file changes');
  }

  return {
    summary: parsed.summary?.trim() || 'AI patch',
    files,
  };
}

export async function generateAiPatch(params: {
  prompt: string;
  files: FlatFiles;
  activePath: string | null;
  templateId: TemplateId;
}): Promise<AiPatchProposal> {
  const settings = loadAiSettings();
  if (!settings.apiKey) {
    throw new Error(
      'No API key. Open AI Surgeon settings and add your key, or set VITE_AI_API_KEY in .env'
    );
  }

  const system = `You are a surgical code editor inside a browser IDE (WebContainer + Vite).
The user's preview app runs from the project files below (e.g. src/App.tsx, src/index.css, tailwind.config).
Apply ONLY the minimum changes needed for the user's request.
Respond with ONLY valid JSON (no markdown fences):
{"summary":"one line description","files":{"relative/path":"complete file contents after edit"}}
Rules:
- Include ONLY files you create or modify
- Each value must be the FULL file content after your edit
- Do not rewrite unrelated files
- For theme/color changes, edit src/index.css, tailwind.config.js/cjs, and/or src/App.tsx as appropriate
- Keep the stack: ${params.templateId}
- Preserve TypeScript/React/Vite conventions`;

  const user = `Request: ${params.prompt}

Project files:
${buildProjectContext(params.files, params.activePath)}`;

  const endpoint = resolveChatEndpoint(settings.baseUrl);
  const body: Record<string, unknown> = {
    model: settings.model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };

  body.response_format = { type: 'json_object' };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const hint = usesDevProxy(settings.baseUrl)
      ? ' Restart `npm run dev` so the xAI/OpenAI proxy is active.'
      : ' This provider may block browser requests (CORS).';
    throw new Error(
      `Failed to reach AI API (${endpoint}).${hint} ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    let message = `AI API error (${response.status})`;
    try {
      const j = JSON.parse(errText) as { error?: { message?: string } };
      message = j.error?.message ?? message;
    } catch {
      if (errText) message += `: ${errText.slice(0, 200)}`;
    }
    throw new Error(message);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI');

  return parseProposalJson(content);
}

export function mergePatch(base: FlatFiles, patch: FlatFiles): FlatFiles {
  return { ...base, ...patch };
}

export function validatePatch(base: FlatFiles, patch: FlatFiles): string | null {
  for (const path of Object.keys(patch)) {
    if (path.includes('..') || path.startsWith('/')) {
      return `Invalid path: ${path}`;
    }
    if (typeof patch[path] !== 'string') {
      return `Invalid content for ${path}`;
    }
  }
  const merged = mergePatch(base, patch);
  if (!merged['index.html'] && !Object.keys(merged).some((p) => p.endsWith('.html'))) {
    return 'Patch would remove all HTML entry files';
  }
  return null;
}