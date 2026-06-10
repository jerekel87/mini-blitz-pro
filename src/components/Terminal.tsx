import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import type { WebContainerProcess } from '@webcontainer/api';
import '@xterm/xterm/css/xterm.css';
import { getXtermTheme } from '../lib/uiTheme';

interface TerminalProps {
  onReady?: (write: (data: string) => void) => void;
  spawnShell: (cols: number, rows: number) => Promise<WebContainerProcess | null>;
  visible?: boolean;
  isReplay?: boolean;
  replayOutput?: string | null;
  /** Hide chrome when rendered inside WorkspaceDock */
  embedded?: boolean;
}

export function TerminalPanel({
  spawnShell,
  onReady,
  visible = true,
  isReplay = false,
  replayOutput = null,
  embedded = false,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const processRef = useRef<WebContainerProcess | null>(null);
  const mountedRef = useRef(false);
  const onDataDisposeRef = useRef<{ dispose: () => void } | null>(null);
  const onReadyRef = useRef(onReady);
  const spawnShellRef = useRef(spawnShell);
  const isReplayRef = useRef(isReplay);
  const lastReplayRef = useRef<string | null>(null);

  onReadyRef.current = onReady;
  spawnShellRef.current = spawnShell;
  isReplayRef.current = isReplay;

  useEffect(() => {
    if (!visible || !containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

    const term = new XTerm({
      theme: getXtermTheme(),
      fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.35,
      cursorBlink: true,
      scrollback: 5000,
      disableStdin: false,
    });

    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    term.loadAddon(fit);
    term.loadAddon(webLinks);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    term.writeln('\x1b[37mGrok Build\x1b[0m — WebContainer shell');
    term.writeln('');
    onReadyRef.current?.((data) => term.write(data));

    let inputWriter: WritableStreamDefaultWriter<string> | null = null;
    let connectGen = 0;

    const connectShell = async () => {
      const gen = ++connectGen;
      const dims = fit.proposeDimensions();
      const cols = dims?.cols ?? 80;
      const rows = dims?.rows ?? 24;

      const proc = await spawnShellRef.current(cols, rows);
      if (!proc || gen !== connectGen || !termRef.current) {
        if (gen === connectGen && !proc) {
          term.writeln('\x1b[33mWaiting for WebContainer…\x1b[0m');
        }
        return;
      }

      onDataDisposeRef.current?.dispose();
      processRef.current = proc;
      inputWriter = proc.input.getWriter();

      proc.output.pipeTo(
        new WritableStream({
          write(chunk) {
            if (!termRef.current || isReplayRef.current) return;
            termRef.current.write(chunk);
          },
        })
      );

      onDataDisposeRef.current = term.onData((data) => {
        if (!isReplayRef.current) {
          inputWriter?.write(data).catch(() => undefined);
        }
      });
    };

    let resizeRaf = 0;
    const resizeObserver = new ResizeObserver(() => {
      if (!fitRef.current || !termRef.current) return;
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        fitRef.current?.fit();
        const dims = fitRef.current?.proposeDimensions();
        if (dims && processRef.current) {
          processRef.current.resize({ cols: dims.cols, rows: dims.rows });
        }
      });
    });
    resizeObserver.observe(containerRef.current);

    const timer = window.setTimeout(connectShell, 400);

    return () => {
      connectGen += 1;
      clearTimeout(timer);
      cancelAnimationFrame(resizeRaf);
      resizeObserver.disconnect();
      onDataDisposeRef.current?.dispose();
      processRef.current?.kill();
      processRef.current = null;
      inputWriter?.close();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      mountedRef.current = false;
    };
  }, [visible]);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    term.options.disableStdin = isReplay;

    if (!isReplay) {
      lastReplayRef.current = null;
      return;
    }

    if (replayOutput === null) return;
    if (lastReplayRef.current === replayOutput) return;

    lastReplayRef.current = replayOutput;
    term.clear();
    term.write(replayOutput);
    term.writeln('\r\n\x1b[35m[ Session replay — input disabled ]\x1b[0m');
  }, [isReplay, replayOutput]);

  return (
    <div className="terminal-shell">
      {!embedded && (
        <div className="panel-header">
          <span className="panel-title">Terminal</span>
          {isReplay && (
            <span className="border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-2xs font-medium text-violet-300">
              Replay
            </span>
          )}
        </div>
      )}
      <div className="terminal-viewport">
        <div ref={containerRef} className="terminal-host" />
      </div>
      {embedded && isReplay && (
        <div className="terminal-replay-footer shrink-0 border-t border-xai-border-subtle text-2xs text-xai-violet">
          Timeline replay — shell input disabled
        </div>
      )}
    </div>
  );
}