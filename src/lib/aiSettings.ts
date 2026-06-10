export interface AiSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const STORAGE_KEY = 'mini-blitz-ai-settings';

const DEFAULTS: AiSettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

export const GROK_PRESET: AiSettings = {
  apiKey: '',
  baseUrl: 'https://api.x.ai/v1',
  model: 'grok-3-mini',
};

export function loadAiSettings(): AiSettings {
  const envKey = import.meta.env.VITE_AI_API_KEY as string | undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<AiSettings>) : {};
    return {
      apiKey: stored.apiKey || envKey || DEFAULTS.apiKey,
      baseUrl: stored.baseUrl || DEFAULTS.baseUrl,
      model: stored.model || DEFAULTS.model,
    };
  } catch {
    return { ...DEFAULTS, apiKey: envKey || '' };
  }
}

export function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Browser cannot call provider APIs directly (CORS) — route through Vite proxy in dev/preview. */
export function resolveChatEndpoint(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/$/, '').toLowerCase();

  if (normalized.includes('api.openai.com')) {
    return '/api/ai-proxy/chat/completions';
  }
  if (normalized.includes('api.x.ai') || normalized.includes('x.ai')) {
    return '/api/xai-proxy/chat/completions';
  }

  return `${baseUrl.replace(/\/$/, '')}/chat/completions`;
}

export function usesDevProxy(baseUrl: string): boolean {
  const normalized = baseUrl.replace(/\/$/, '').toLowerCase();
  return normalized.includes('api.openai.com') || normalized.includes('api.x.ai');
}

export function providerLabel(baseUrl: string): string {
  const normalized = baseUrl.toLowerCase();
  if (normalized.includes('api.x.ai') || normalized.includes('x.ai')) return 'Grok (xAI)';
  if (normalized.includes('api.openai.com')) return 'OpenAI';
  return 'Custom';
}