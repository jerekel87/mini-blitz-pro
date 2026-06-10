import { Files, Code2, LayoutPanelLeft, Terminal, History, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export type MobilePanel = 'files' | 'editor' | 'preview' | 'terminal' | 'timeline' | 'ai';

interface MobileNavProps {
  active: MobilePanel;
  onChange: (panel: MobilePanel) => void;
}

const ITEMS: { id: MobilePanel; label: string; icon: typeof Files }[] = [
  { id: 'files', label: 'Files', icon: Files },
  { id: 'editor', label: 'Code', icon: Code2 },
  { id: 'preview', label: 'Lab', icon: LayoutPanelLeft },
  { id: 'terminal', label: 'Shell', icon: Terminal },
  { id: 'timeline', label: 'Time', icon: History },
  { id: 'ai', label: 'Ask', icon: Sparkles },
];

export function MobileNav({ active, onChange }: MobileNavProps) {
  return (
    <nav
      className="mobile-nav flex h-[var(--mobile-nav-height)] shrink-0 items-stretch justify-around border-t border-xai-border bg-xai-surface px-0.5 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Panel navigation"
    >
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={clsx(
            'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[0.5625rem] font-medium transition-colors touch-manipulation',
            active === id ? 'text-xai-fg' : 'text-xai-muted'
          )}
        >
          {active === id && (
            <span className="absolute inset-x-3 top-0 h-[2px] bg-xai-accent" aria-hidden />
          )}
          <Icon className="h-5 w-5" strokeWidth={1.5} />
          {label}
        </button>
      ))}
    </nav>
  );
}