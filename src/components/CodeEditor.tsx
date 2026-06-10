import { useCallback, useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { getEditorFontSizePx } from '../lib/applyAccountAppearance';
import { ensureMonacoThemes, MONACO_THEME } from '../lib/uiTheme';
import type { UserAppearance, UserSettings } from '../lib/userAccount';
import { getLanguage } from '../lib/fileTree';
import type { SourceLocation } from '../hooks/usePreviewNavigation';

export interface EditorPreferences {
  tabSize: UserSettings['tabSize'];
  wordWrap: UserSettings['wordWrap'];
  fontSize: UserAppearance['fontSize'];
  formatOnSave: UserSettings['formatOnSave'];
  vimMode: UserSettings['vimMode'];
}

interface CodeEditorProps {
  path: string | null;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  jumpTo?: SourceLocation | null;
  onCursorMove?: (file: string, line: number, column: number) => void;
  preferences?: EditorPreferences;
  onSaveShortcut?: () => void;
}

export function CodeEditor({
  path,
  value,
  onChange,
  readOnly = false,
  jumpTo,
  onCursorMove,
  preferences,
  onSaveShortcut,
}: CodeEditorProps) {
  const monacoTheme = MONACO_THEME;
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decorationRef = useRef<string[]>([]);
  const suppressCursorRef = useRef(false);

  const tabSize = preferences?.tabSize ?? 2;
  const wordWrap = preferences?.wordWrap ?? true;
  const fontPx = preferences ? getEditorFontSizePx(preferences.fontSize) : 13;

  const clearJumpDecoration = useCallback(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (ed && monaco && decorationRef.current.length) {
      ed.deltaDecorations(decorationRef.current, []);
      decorationRef.current = [];
    }
  }, []);

  const applyEditorOptions = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.updateOptions({
      fontSize: fontPx,
      fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
      minimap: { enabled: window.innerWidth > 768 },
      padding: { top: 8 },
      scrollBeyondLastLine: false,
      wordWrap: wordWrap ? 'on' : 'off',
      tabSize,
      insertSpaces: true,
    });
  }, [fontPx, wordWrap, tabSize]);

  const formatDocument = useCallback(async () => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;
    const action = ed.getAction('editor.action.formatDocument');
    if (action) await action.run();
  }, []);

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    ensureMonacoThemes(monaco);
    monaco.editor.setTheme(monacoTheme);
    applyEditorOptions();

    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void (async () => {
        if (preferences?.formatOnSave) await formatDocument();
        onSaveShortcut?.();
      })();
    });

    ed.onDidChangeCursorPosition((e) => {
      if (suppressCursorRef.current || !path || !onCursorMove) return;
      onCursorMove(path, e.position.lineNumber, e.position.column);
    });
  };

  useEffect(() => {
    applyEditorOptions();
  }, [applyEditorOptions]);

  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco || !jumpTo || jumpTo.file !== path) {
      clearJumpDecoration();
      return;
    }

    const applyJump = () => {
      const model = ed.getModel();
      if (!model) return false;

      const lineCount = model.getLineCount();
      const line = Math.min(Math.max(1, jumpTo.line), lineCount);
      const lineLen = model.getLineMaxColumn(line);
      const column = Math.min(Math.max(1, jumpTo.column), lineLen);

      suppressCursorRef.current = true;
      ed.revealLineInCenter(line);
      ed.setPosition({ lineNumber: line, column });
      ed.focus();
      window.setTimeout(() => {
        suppressCursorRef.current = false;
      }, 0);

      decorationRef.current = ed.deltaDecorations(decorationRef.current, [
        {
          range: new monaco.Range(line, 1, line, lineLen),
          options: {
            isWholeLine: true,
            className: 'editor-jump-line-highlight',
          },
        },
      ]);
      return true;
    };

    if (!applyJump()) {
      const id = window.requestAnimationFrame(() => {
        applyJump();
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [jumpTo, path, value, clearJumpDecoration]);

  useEffect(() => {
    if (!jumpTo || jumpTo.file !== path) clearJumpDecoration();
  }, [path, jumpTo, clearJumpDecoration]);

  if (!path) {
    return (
      <div className="flex h-full items-center justify-center bg-xai-bg text-sm text-xai-muted">
        Select a file to edit
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {preferences?.vimMode && (
        <p className="editor-pref-banner shrink-0 border-b border-xai-border-subtle px-3 py-1 text-2xs text-xai-muted">
          Vim preference saved — full modal keybindings are not enabled in this build yet.
        </p>
      )}
      <div className="min-h-0 flex-1">
        <Editor
          key={`${path}-${tabSize}-${wordWrap}-${fontPx}-${monacoTheme}`}
          height="100%"
          language={getLanguage(path)}
          value={value}
          theme={monacoTheme}
          onChange={(v) => onChange(v ?? '')}
          onMount={handleMount}
          loading={
            <div className="flex h-full items-center justify-center bg-xai-bg text-xai-muted">
              Loading editor…
            </div>
          }
          options={{
            automaticLayout: true,
            tabSize,
            readOnly,
            glyphMargin: true,
            wordWrap: wordWrap ? 'on' : 'off',
            fontSize: fontPx,
          }}
        />
      </div>
    </div>
  );
}