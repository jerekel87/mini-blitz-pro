import type { UserAppearance } from './userAccount';

const FONT_PX: Record<UserAppearance['fontSize'], number> = {
  small: 12,
  medium: 13,
  large: 15,
};

export function getEditorFontSizePx(fontSize: UserAppearance['fontSize']): number {
  return FONT_PX[fontSize];
}

export function applyAccountAppearance(appearance: UserAppearance): void {
  const root = document.documentElement;
  root.dataset.uiTheme = 'dark';
  root.dataset.uiCompact = appearance.compactMode ? 'true' : 'false';
  root.dataset.uiFontSize = appearance.fontSize;
  root.style.colorScheme = 'dark';
  root.style.setProperty('--editor-font-size', `${getEditorFontSizePx(appearance.fontSize)}px`);
  if (appearance.compactMode) {
    root.style.setProperty('--rail-width', '3.25rem');
    root.style.setProperty('--panel-header-h', '2.5rem');
    root.style.setProperty('--topbar-height', '3rem');
  } else {
    root.style.removeProperty('--rail-width');
    root.style.removeProperty('--panel-header-h');
    root.style.removeProperty('--topbar-height');
  }
}