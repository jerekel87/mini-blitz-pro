import React, { useImperativeHandle, useRef, forwardRef } from 'react';
import { Download } from 'lucide-react';
import { useWebContainerProject } from '../hooks/useWebContainerProject';
import { useAiPatch, type AiPatchStatus } from '../hooks/useAiPatch';
import { useSessionTimeline } from '../hooks/useSessionTimeline';
import { DualPreview } from '../components/DualPreview';
import { CodeEditor } from '../components/CodeEditor';
import { FileExplorer } from '../components/FileExplorer';
import { TerminalPanel } from '../components/Terminal';
import { AiPatchPanel } from '../components/AiPatchPanel';
import { SessionTimeline } from '../components/SessionTimeline';
import { PackagesPanel } from '../components/PackagesPanel';
import { EnvPanel } from '../components/EnvPanel';
import { useParallelUniverse } from '../hooks/useParallelUniverse';
import type { FlatFiles, TemplateId } from '../types';

export interface MiniBlitzHandle {
  loadProject: (files: FlatFiles, templateId?: TemplateId) => Promise<void>;
  getFiles: () => FlatFiles;
  applyPatch: (prompt: string) => Promise<void>;
  runCommand: (command: string) => Promise<void>;
  focusFile: (path: string) => void;
  exportProject: (name?: string) => Promise<void>;
}

export interface MiniBlitzEmbedProps {
  initialFiles?: FlatFiles;
  templateId?: TemplateId;
  embedded?: boolean;           // Hide heavy chrome (recommended when injected into Bolt UI)
  showFileExplorer?: boolean;
  showEditor?: boolean;
  showDualPreview?: boolean;
  showTerminal?: boolean;
  showAiPanel?: boolean;
  showTimeline?: boolean;
  showParallelUniverses?: boolean;
  showPackages?: boolean;
  showEnv?: boolean;
  showProblems?: boolean;
  showSearch?: boolean;

  // Events for parent (Bolt.new clone)
  onFilesChange?: (files: FlatFiles) => void;
  onPreviewReady?: (url: string, port: number) => void;
  onTerminalOutput?: (data: string) => void;
  onAiPatchStatus?: (status: AiPatchStatus, proposal?: any) => void;
  onError?: (error: string) => void;
}

export const MiniBlitzEmbed = forwardRef<MiniBlitzHandle, MiniBlitzEmbedProps>(
  function MiniBlitzEmbed(
    {
      initialFiles,
      templateId = 'react-vite-tailwind',
      embedded = true,
      showFileExplorer = true,
      showEditor = true,
      showDualPreview = true,
      showTerminal = true,
      showAiPanel = true,
      showTimeline = false,
      showParallelUniverses = false,
      showPackages = false,
      showEnv = false,
      showProblems = false,
      showSearch = false,

      onFilesChange,
      onPreviewReady,
      onTerminalOutput,
      onAiPatchStatus,
      onError,
    },
    ref
  ) {
    const {
      files,
      setFiles,
      previewUrl,
      status,
      error,
      boot,
      reloadProject,
      writeFile: wcWriteFile,
    } = useWebContainerProject({
      templateId,
      onServerReady: onPreviewReady,
      onTerminalOutput,
    });

    const ai = useAiPatch({
      files,
      activePath: null, // parent can control this if needed
      templateId,
      onApply: async (merged, changed) => {
        setFiles(merged);
        onFilesChange?.(merged);
      },
      onRollback: async (prev) => {
        setFiles(prev);
        onFilesChange?.(prev);
      },
      onRecordTimeline: (summary, merged) => {
        // timeline hook will pick it up
      },
    });

    const timeline = useSessionTimeline({ initialFiles: files });
    const universes = useParallelUniverse({ baseFiles: files });

    // Expose imperative handle to parent
    useImperativeHandle(ref, () => ({
      async loadProject(newFiles: FlatFiles, newTemplate?: TemplateId) {
        try {
          await reloadProject(newFiles, newTemplate);
          setFiles(newFiles);
          onFilesChange?.(newFiles);
          timeline.recordSnapshot(newFiles, 'Loaded from parent');
        } catch (e: any) {
          onError?.(e.message || 'Failed to load project');
        }
      },

      getFiles() {
        return { ...files };
      },

      async applyPatch(prompt: string) {
        try {
          await ai.generate();
          if (ai.status === 'review' && ai.proposal) {
            await ai.apply();
            onAiPatchStatus?.('applying', ai.proposal);
          }
        } catch (e: any) {
          onError?.(e.message || 'AI patch failed');
        }
      },

      async runCommand(command: string) {
        // For now, log to terminal — full shell can be added via webcontainer hook
        onTerminalOutput?.(`$ ${command}\n`);
        // In a full integration you would spawn via the webcontainer instance
      },

      focusFile(path: string) {
        // In a real embed you would lift editor state or use a context
        // For now this is a placeholder — connect to CodeEditor ref if needed
        console.log('[MiniBlitzEmbed] focusFile requested:', path);
      },

      async exportProject(name) {
        try {
          const { exportProjectAsZip } = await import('../lib/export');
          await exportProjectAsZip(files, name || `mini-blitz-${templateId}`);
        } catch (e: any) {
          onError?.(e.message || 'Export failed');
        }
      },
    }), [files, setFiles, reloadProject, ai, timeline, onFilesChange, onTerminalOutput, onError, templateId]);

    // Notify parent on file changes (debounced in real use)
    React.useEffect(() => {
      onFilesChange?.(files);
    }, [files, onFilesChange]);

    // Forward preview ready
    React.useEffect(() => {
      if (previewUrl && onPreviewReady) {
        onPreviewReady(previewUrl, 5173);
      }
    }, [previewUrl, onPreviewReady]);

    React.useEffect(() => {
      if (error) onError?.(error);
    }, [error, onError]);

    // Auto-boot on mount
    React.useEffect(() => {
      if (status === 'idle') {
        boot();
      }
    }, [status, boot]);

    // If initialFiles provided, load them once
    const hasLoadedInitial = React.useRef(false);
    React.useEffect(() => {
      if (initialFiles && !hasLoadedInitial.current) {
        hasLoadedInitial.current = true;
        // loadProject will be available after mount, but we can set directly
        setFiles(initialFiles);
      }
    }, [initialFiles, setFiles]);

    const isReady = status === 'ready' || status === 'running';

    return (
      <div className="mini-blitz-embed flex h-full w-full flex-col overflow-hidden bg-[#0a0a0a] text-white">
        {/* Minimal header for embedded use */}
        {embedded && (
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-1 text-xs">
            <div className="font-mono text-white/60">MiniBlitz (embedded)</div>
            <div className="flex items-center gap-2 text-white/40">
              <button
                onClick={() => {
                  // call via handle if parent provides, else internal
                  // For direct use of <MiniBlitzEmbed />, we can trigger here
                  import('../lib/export').then(({ exportProjectAsZip }) => {
                    exportProjectAsZip(files, `mini-blitz-${templateId}`);
                  });
                }}
                className="hover:text-white"
                title="Export as ZIP"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <span>{status}</span>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* File explorer (optional) */}
          {showFileExplorer && (
            <div className="w-56 border-r border-white/10 overflow-auto">
              <FileExplorer
                files={files}
                activePath={null}
                onSelect={(path) => {
                  // parent controls active file in full embed
                  console.log('File selected in embed:', path);
                }}
              />
            </div>
          )}

          {/* Editor + Previews */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {showEditor && (
              <div className="h-1/2 border-b border-white/10 overflow-hidden">
                <CodeEditor
                  files={files}
                  activePath="src/App.tsx" // controlled by parent in real use
                  onChange={(path, content) => {
                    const next = { ...files, [path]: content };
                    setFiles(next);
                  }}
                />
              </div>
            )}

            {showDualPreview && (
              <div className="flex-1 overflow-hidden">
                <DualPreview
                  instantFrameRef={React.useRef(null)}
                  truthFrameRef={React.useRef(null)}
                  previewUrl={previewUrl}
                  isReady={isReady}
                />
              </div>
            )}
          </div>

          {/* Side panels */}
          <div className="flex w-80 flex-col border-l border-white/10">
            {showTerminal && (
              <div className="flex-1 overflow-hidden border-b border-white/10">
                <TerminalPanel embedded={embedded} />
              </div>
            )}

            {showAiPanel && (
              <div className="flex-1 overflow-hidden">
                <AiPatchPanel
                  ai={ai}
                  embedded={embedded}
                  onPromptChange={() => {}}
                />
              </div>
            )}

            {showTimeline && (
              <div className="flex-1 overflow-hidden">
                <SessionTimeline embedded={embedded} />
              </div>
            )}

            {showPackages && (
              <div className="flex-1 overflow-hidden border-t border-white/10">
                <PackagesPanel
                  files={files}
                  onUpdateFile={(path, content) => {
                    const next = { ...files, [path]: content };
                    setFiles(next);
                    onFilesChange?.(next);
                  }}
                  onLog={onTerminalOutput || (() => {})}
                  embedded
                />
              </div>
            )}

            {showEnv && (
              <div className="flex-1 overflow-hidden border-t border-white/10">
                <EnvPanel
                  files={files}
                  onUpdateFile={(path, content) => {
                    const next = { ...files, [path]: content };
                    setFiles(next);
                    onFilesChange?.(next);
                  }}
                  onImportFromGitHub={async (owner, repo, branch) => {
                    // Simple passthrough - parent can handle or we can implement basic fetch here
                    onError?.('GitHub import in embed: implement via parent or extend here');
                  }}
                  embedded
                />
              </div>
            )}

            {showProblems && (
              <div className="flex-1 overflow-hidden border-t border-white/10">
                <ProblemsPanel
                  problems={[] /* parent can pass real problems array via context or lift state */}
                  onSelect={(p) => console.log('Problem selected in embed:', p)}
                  onClear={() => {}}
                  embedded
                />
              </div>
            )}

            {showSearch && (
              <div className="flex-1 overflow-hidden border-t border-white/10">
                <SearchPanel
                  files={files}
                  onOpenFile={(path, line, column) => {
                    console.log('Search open in embed:', path, line, column);
                  }}
                  onFilesChanged={(newFiles) => {
                    setFiles(newFiles);
                    onFilesChange?.(newFiles);
                  }}
                  embedded
                />
              </div>
            )}
          </div>
        </div>

        {showParallelUniverses && <div className="border-t border-white/10 p-2"><ParallelUniverseLab /></div>}
      </div>
    );
  }
);

export type { MiniBlitzHandle, MiniBlitzEmbedProps, FlatFiles, TemplateId };

// Convenience hook for even more custom embedding (use with your own layout)
export { useWebContainerProject } from '../hooks/useWebContainerProject';
export { useAiPatch } from '../hooks/useAiPatch';
