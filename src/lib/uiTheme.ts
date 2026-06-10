const MONACO_GROK_DARK = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#030303',
    'editor.foreground': '#f4f4f5',
    'editorLineNumber.foreground': '#71717a',
    'editorLineNumber.activeForeground': '#a1a1aa',
    'editor.selectionBackground': '#ffffff24',
    'editor.inactiveSelectionBackground': '#ffffff14',
    'editorCursor.foreground': '#fafafa',
    'editorWidget.background': '#111111',
    'editorWidget.border': '#222222',
    'input.background': '#161616',
    'dropdown.background': '#111111',
    'list.hoverBackground': '#ffffff0a',
    'scrollbarSlider.background': '#ffffff18',
  },
};

let monacoThemesRegistered = false;

export const MONACO_THEME = 'grok-dark' as const;

export function ensureMonacoThemes(monaco: typeof import('monaco-editor')): void {
  if (monacoThemesRegistered) return;
  monaco.editor.defineTheme(MONACO_THEME, MONACO_GROK_DARK);
  monacoThemesRegistered = true;
}

export function getXtermTheme() {
  return {
    background: '#030303',
    foreground: '#e4e4e7',
    cursor: '#fafafa',
    selectionBackground: 'rgba(255, 255, 255, 0.12)',
    black: '#3f3f46',
    red: '#f87171',
    green: '#4ade80',
    yellow: '#facc15',
    blue: '#a1a1aa',
    magenta: '#e879f9',
    cyan: '#67e8f9',
    white: '#fafafa',
  };
}