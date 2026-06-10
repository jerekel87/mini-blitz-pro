import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from 'react-resizable-panels';
import { History } from 'lucide-react';
import { TopBar } from './components/layout/TopBar';
import { ActivityRail } from './components/layout/ActivityRail';
import { WorkspaceDock, type DockTab } from './components/layout/WorkspaceDock';
import { FloatingPanel } from './components/layout/FloatingPanel';
import { WorkspaceMenu } from './components/layout/WorkspaceMenu';
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout';
import { useAnimatedDockResize } from './hooks/useAnimatedDockResize';
import { DockMotionProvider } from './context/DockMotionContext';
import { DockZoneDropOverlay } from './components/layout/DockZoneDropOverlay';
import { DockDragPreview } from './components/layout/DockDragPreview';
import type { FloatReleasePoint } from './lib/workspaceLayout';
import { floatRectFromRelease } from './lib/workspaceLayout';
import { DOCK_TABS } from './lib/dockZones';
import {
  getBottomDockSize,
  getCenterEditorSize,
  getCompanionPanelSize,
  getDockZonePanelSize,
  getPreviewMainSize,
} from './lib/dockZoneSizing';
import { isPreviewColumnVisible } from './lib/workspaceLayout';
import type { DockZoneId } from './lib/workspaceLayout';
import { FileExplorer } from './components/FileExplorer';
import { CodeEditor } from './components/CodeEditor';
import { EditorTabs } from './components/EditorTabs';
import { ParallelUniverseLab } from './components/ParallelUniverseLab';
import { useInstantPreview } from './hooks/useInstantPreview';
import { useParallelUniverse } from './hooks/useParallelUniverse';
import { TerminalPanel } from './components/Terminal';
import { SessionTimeline } from './components/SessionTimeline';
import { AiPatchPanel } from './components/AiPatchPanel';
import { PackagesPanel } from './components/PackagesPanel';
import { EnvPanel } from './components/EnvPanel';
import { ProblemsPanel, type Problem } from './components/ProblemsPanel';
import { SearchPanel } from './components/SearchPanel';
import { MobileNav, type MobilePanel } from './components/MobileNav';
import { NativeAppBanner } from './components/NativeAppBanner';
import { useWebContainerProject } from './hooks/useWebContainerProject';
import { useSessionTimeline } from './hooks/useSessionTimeline';
import { useAiPatch } from './hooks/useAiPatch';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useWorkspacePanelSizes } from './hooks/useWorkspacePanelSizes';
import { useUserAccount } from './hooks/useUserAccount';
import { AccountWorkspace } from './components/account/AccountWorkspace';
import { AccountNotificationProvider } from './context/AccountNotificationContext';
import { useAccountNotification } from './context/AccountNotificationContext';
import {
  isValidDefaultTemplate,
  loadUserAccount,
} from './lib/userAccount';
import { usePreviewNavigation, type SourceLocation } from './hooks/usePreviewNavigation';
import { computeDualReality } from './lib/dualReality';
import { resolveNavigateLocation } from './lib/sourceNavigation';
import { getTemplate } from './lib/templates';
import { exportProjectAsZip } from './lib/export';
import type { TemplateId } from './types';

const DEFAULT_ENTRY = 'src/App.tsx';

const FLOAT_TITLES: Record<DockTab, string> = {
  timeline: 'Session',
  terminal: 'Terminal',
  ai: 'Ask Jeremy',
  packages: 'Packages',
  env: 'Env',
  problems: 'Problems',
};

function AppWorkspace({ userAccount }: { userAccount: ReturnType<typeof useUserAccount> }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const panelSizes = useWorkspacePanelSizes();
  const notify = useAccountNotification();
  const editorPrefs = userAccount.account.settings;
  const [templateId, setTemplateId] = useState<TemplateId>(() => {
    const t = loadUserAccount().settings.defaultTemplate;
    return isValidDefaultTemplate(t) ? (t as TemplateId) : 'react-vite-tailwind';
  });
  const [activePath, setActivePath] = useState<string | null>(DEFAULT_ENTRY);
  const [openTabs, setOpenTabs] = useState<string[]>([DEFAULT_ENTRY]);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('editor');
  const terminalWriteRef = useRef<(data: string) => void>();
  const recordTerminalRef = useRef<(data: string) => void>();
  const instantFrameRef = useRef<HTMLIFrameElement>(null);
  const instantBFrameRef = useRef<HTMLIFrameElement>(null);
  const truthFrameRef = useRef<HTMLIFrameElement>(null);
  const [jumpTo, setJumpTo] = useState<SourceLocation | null>(null);
  const [lastNavigate, setLastNavigate] = useState<SourceLocation | null>(null);
  const [inspectMode, setInspectMode] = useState(false);
  const [dockTab, setDockTab] = useState<DockTab>('timeline');
  const [accountOpen, setAccountOpen] = useState(false);
  const workspace = useWorkspaceLayout();
  const showPreviewColumn = isPreviewColumnVisible(
    workspace.layout.panels,
    workspace.layout.preview
  );
  const floatingTabs = DOCK_TABS.filter((t) => workspace.isFloating(t));
  const allDockFloated = floatingTabs.length === DOCK_TABS.length;
  const dockPanelRef = useRef<ImperativePanelHandle>(null);

  const dockInZone = (zone: DockZoneId) => workspace.getDockedInZone(zone);
  const sidebarDockTabs = dockInZone('sidebar-below');
  const editorAboveDockTabs = dockInZone('editor-above');
  const bottomDockTabs = dockInZone('bottom');
  const previewAboveDockTabs = dockInZone('preview-above');
  const previewBelowDockTabs = dockInZone('preview-below');
  const sidebarDocked = sidebarDockTabs.length > 0;
  const editorAboveDocked = editorAboveDockTabs.length > 0;
  const bottomDocked = bottomDockTabs.length > 0;
  const previewAboveDocked = previewAboveDockTabs.length > 0;
  const previewBelowDocked = previewBelowDockTabs.length > 0;
  const showBottomPanel = bottomDocked || allDockFloated;
  const bottomDockSize = getDockZonePanelSize(bottomDockTabs, 'bottom');

  useAnimatedDockResize(
    dockPanelRef,
    allDockFloated ? 13 : bottomDocked ? getBottomDockSize(bottomDockTabs, panelSizes.dock) : 0,
    !isMobile && showBottomPanel
  );

  const handleFloatTab = useCallback(
    (tab: DockTab, release: FloatReleasePoint) => {
      const rect = floatRectFromRelease(tab, release);
      workspace.floatTab(tab, release, rect);
    },
    [workspace]
  );

  const focusDock = useCallback(
    (tab: DockTab) => {
      workspace.focusDockTab(tab);
      setDockTab(tab);
    },
    [workspace]
  );

  const handleRailExplorer = useCallback(() => {
    workspace.togglePanel('explorer');
  }, [workspace]);

  const handleRailLab = useCallback(() => {
    workspace.togglePanel('preview');
  }, [workspace]);

  const handleTerminalOutput = useCallback((data: string) => {
    recordTerminalRef.current?.(data);
    terminalWriteRef.current?.(data);
  }, []);

  const handleTerminalReady = useCallback((write: (data: string) => void) => {
    terminalWriteRef.current = write;
  }, []);

  const {
    status,
    error,
    files,
    previewUrl,
    patchLocalFile,
    syncFile,
    syncAllFiles,
    syncPatchedFiles,
    reloadProject,
    spawnShell,
  } = useWebContainerProject({
    templateId,
    onTerminalOutput: handleTerminalOutput,
  });

  const timeline = useSessionTimeline({
    liveFiles: files,
    templateId,
    bootStatus: status,
    onRestoreToContainer: syncAllFiles,
    lastEditedPath: activePath,
  });

  recordTerminalRef.current = timeline.recordTerminal;

  const parallel = useParallelUniverse({
    universeAFiles: files,
    onSyncToContainer: syncAllFiles,
    disabled: timeline.isReplay,
  });

  const { blobUrl: instantUrl, error: instantError, unsupportedReasons, ready: instantReady } =
    useInstantPreview(parallel.instantAFiles, 'index.html');

  const {
    blobUrl: instantBUrl,
    error: instantBError,
    unsupportedReasons: instantBUnsupported,
    ready: instantBReady,
  } = useInstantPreview(parallel.instantBFiles ?? {}, 'index.html');

  const handlePreviewNavigate = useCallback(
    (loc: SourceLocation) => {
      const fileMap = timeline.isReplay ? timeline.displayFiles : parallel.editorFiles;
      const content = fileMap[loc.file] ?? '';
      const snapped = content
        ? resolveNavigateLocation(content, loc.line, loc.column, loc.dom)
        : { line: loc.line, column: loc.column };
      const resolved: SourceLocation = {
        ...loc,
        line: snapped.line,
        column: snapped.column,
      };
      setLastNavigate(resolved);
      setJumpTo(resolved);
      setActivePath(resolved.file);
      setOpenTabs((t) => (t.includes(resolved.file) ? t : [...t, resolved.file]));
      if (isMobile) setMobilePanel('editor');
    },
    [isMobile, timeline.isReplay, timeline.displayFiles, parallel.editorFiles]
  );

  const { setEditorCursor, setInspectMode: syncInspectMode } = usePreviewNavigation({
    knownFiles: timeline.isReplay ? timeline.displayFiles : parallel.editorFiles,
    onNavigate: handlePreviewNavigate,
    instantFrameRef,
    instantBFrameRef,
    truthFrameRef,
  });

  const handleInspectModeChange = useCallback(
    (enabled: boolean) => {
      setInspectMode(enabled);
      syncInspectMode(enabled);
    },
    [syncInspectMode]
  );

  useEffect(() => {
    syncInspectMode(inspectMode);
  }, [inspectMode, syncInspectMode, instantUrl, previewUrl]);

  const dualRealityLive = useMemo(
    () =>
      computeDualReality({
        instantError,
        instantReady,
        instantUnsupported: unsupportedReasons,
        truthUrl: previewUrl,
        truthBootStatus: status,
        truthError: error,
      }),
    [instantError, instantReady, unsupportedReasons, previewUrl, status, error]
  );

  useEffect(() => {
    timeline.recordDualReality(dualRealityLive);
  }, [
    dualRealityLive.alignment,
    dualRealityLive.label,
    dualRealityLive.detail,
    timeline.recordDualReality,
  ]);

  const aiSourceFiles = timeline.isReplay ? timeline.displayFiles : parallel.editorFiles;

  const ai = useAiPatch({
    files: aiSourceFiles,
    activePath,
    templateId,
    disabled: timeline.isReplay,
    onApply: async (merged, changedPaths) => {
      if (parallel.activeUniverse === 'b' && parallel.filesB) {
        await parallel.applyPatchToB(merged, changedPaths);
      } else {
        await syncPatchedFiles(merged, changedPaths);
        if (parallel.hasB) {
          parallel.patchFilesB(changedPaths, merged);
        }
      }
      if (changedPaths.length > 0) {
        setOpenTabs((t) => [...new Set([...t, ...changedPaths])]);
        setActivePath(changedPaths[0]);
      }
      userAccount.recordAiPatch();
      notify.push('Ask Jeremy patch applied to your project.', 'aiPatchReady');
      // Polish for Bolt.new clone: uncomment to auto-export ZIP on every AI apply for iteration snapshots
      // exportProjectAsZip(merged, `ai-iteration-${Date.now()}`);
    },
    onRollback: syncAllFiles,
    onRecordTimeline: timeline.recordAiPatch,
  });

  useEffect(() => {
    if (status !== 'ready') return;
    const id = window.setInterval(() => {
      userAccount.tickWebContainerMinute();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [status, userAccount]);

  useEffect(() => {
    userAccount.syncStorageUsage(files);
  }, [files, userAccount]);

  useEffect(() => {
    if (status === 'error') {
      notify.push('WebContainer build failed — check the terminal for details.', 'buildFailures');
    }
  }, [status, notify]);

  const handleTemplateChange = async (id: TemplateId) => {
    if (id === templateId) return;
    const ok = window.confirm('Switch template? Current project will be replaced.');
    if (!ok) return;
    setTemplateId(id);
    userAccount.updateSettings({ defaultTemplate: id });
    parallel.resetLab();
    const entry = id === 'vanilla-vite' ? 'src/main.ts' : 'src/App.tsx';
    setActivePath(entry);
    setOpenTabs([entry]);
    await reloadProject(id);
    timeline.recordTemplateChange(id, getTemplate(id).files);
  };

  const handleForkB = useCallback(() => {
    parallel.forkB();
    void parallel.switchUniverse('b');
  }, [parallel]);

  const handleRestart = () => reloadProject(templateId);

  const handleEditorChange = (value: string) => {
    if (!activePath || timeline.isReplay) return;
    if (parallel.activeUniverse === 'b' && parallel.filesB) {
      parallel.updateBFile(activePath, value);
    }
    if (editorPrefs.autoSave) {
      void syncFile(activePath, value);
    } else {
      patchLocalFile(activePath, value);
    }
  };

  const selectFile = (path: string) => {
    if (!timeline.displayFiles[path]) return;
    setActivePath(path);
    if (!openTabs.includes(path)) setOpenTabs((t) => [...t, path]);
    if (isMobile) setMobilePanel('editor');
  };

  const searchPanel = (
    <SearchPanel
      files={files}
      onOpenFile={(path, line, column) => {
        selectFile(path);
        // TODO: enhance CodeEditor to accept search highlight {line, column, length}
        console.log('Search opened file with match at', line, column);
      }}
      onFilesChanged={(newFiles) => {
        setFiles(newFiles);
      }}
      embedded
    />
  );

  const closeTab = (path: string) => {
    const next = openTabs.filter((p) => p !== path);
    if (next.length === 0) return;
    setOpenTabs(next);
    if (activePath === path) setActivePath(next[next.length - 1]);
  };

  const handleCreateFile = (path: string) => {
    if (timeline.isReplay) return;
    const ext = path.split('.').pop();
    const content =
      ext === 'tsx' || ext === 'jsx'
        ? `export default function ${path.split('/').pop()?.replace(/\.\w+$/, '') ?? 'Component'}() {\n  return <div>New component</div>;\n}\n`
        : ext === 'ts'
          ? '// new file\n'
          : ext === 'css'
            ? '/* styles */\n'
            : '// file\n';
    if (parallel.activeUniverse === 'b' && parallel.filesB) {
      parallel.updateBFile(path, content);
    }
    syncFile(path, content);
    selectFile(path);
  };

  const editorFileMap = timeline.isReplay ? timeline.displayFiles : parallel.editorFiles;
  const editorContent = activePath ? (editorFileMap[activePath] ?? '') : '';

  const flushEditorToContainer = useCallback(async () => {
    if (!activePath || timeline.isReplay) return;
    const content = editorFileMap[activePath];
    if (content == null) return;
    await syncFile(activePath, content);
    notify.push(`Saved ${activePath}`);
  }, [activePath, timeline.isReplay, editorFileMap, syncFile, notify]);

  const handleApplyDefaultTemplate = async () => {
    const t = userAccount.account.settings.defaultTemplate;
    if (!isValidDefaultTemplate(t)) return;
    await handleTemplateChange(t as TemplateId);
  };

  const explorer = (
    <FileExplorer
      files={editorFileMap}
      activePath={activePath}
      onSelect={selectFile}
      onCreateFile={timeline.isReplay ? undefined : handleCreateFile}
      divergedPaths={parallel.hasB ? parallel.divergedPaths : undefined}
    />
  );

  const editor = (
    <div className="flex h-full min-h-0 flex-col">
      {timeline.isReplay && (
        <div className="flex shrink-0 items-center gap-4 border-b border-xai-border bg-xai-overlay px-5 py-3 text-sm text-xai-secondary">
          <History className="h-4 w-4 shrink-0 text-xai-violet" />
          <span className="min-w-0 flex-1 truncate">
            Replay — {timeline.viewState?.eventLabel}
          </span>
          <button type="button" onClick={timeline.returnToLive} className="btn-secondary !py-1.5 !text-2xs">
            Return to live
          </button>
        </div>
      )}
      <EditorTabs
        tabs={openTabs}
        activePath={activePath}
        onSelect={selectFile}
        onClose={closeTab}
      />
      <div className="min-h-0 flex-1">
        <CodeEditor
          path={activePath}
          value={editorContent}
          onChange={handleEditorChange}
          readOnly={timeline.isReplay}
          jumpTo={jumpTo?.file === activePath ? jumpTo : null}
          preferences={{
            tabSize: editorPrefs.tabSize,
            wordWrap: editorPrefs.wordWrap,
            fontSize: userAccount.account.appearance.fontSize,
            formatOnSave: editorPrefs.formatOnSave,
            vimMode: editorPrefs.vimMode,
          }}
          onSaveShortcut={() => void flushEditorToContainer()}
          onCursorMove={(file, line, column) => {
            if (!timeline.isReplay) setEditorCursor(file, line, column);
          }}
        />
      </div>
    </div>
  );

  const preview = (
    <ParallelUniverseLab
      activeUniverse={parallel.activeUniverse}
      hasB={parallel.hasB}
      divergedPaths={parallel.divergedPaths}
      switching={parallel.switching}
      onSelectUniverse={(id) => void parallel.switchUniverse(id)}
      onForkB={handleForkB}
      onResetB={parallel.resetBFromA}
      onPromoteB={() => void parallel.promoteBToA()}
      onApplyPreset={parallel.applyPreset}
      instantAUrl={instantUrl}
      instantAError={instantError}
      instantAReady={instantReady}
      instantAUnsupported={unsupportedReasons}
      instantBUrl={parallel.hasB ? instantBUrl : null}
      instantBError={instantBError}
      instantBReady={instantBReady}
      instantBUnsupported={instantBUnsupported}
      truthUrl={previewUrl}
      status={status}
      truthError={error}
      replayHint={
        timeline.isReplay
          ? `Timeline @ ${timeline.viewState?.eventLabel} — lab paused during replay`
          : null
      }
      instantAFrameRef={instantFrameRef}
      instantBFrameRef={instantBFrameRef}
      truthFrameRef={truthFrameRef}
      lastNavigate={lastNavigate}
      disabled={timeline.isReplay}
      previewLanes={workspace.layout.preview}
      showParallelLab={workspace.layout.panels.parallelLab}
    />
  );

  const terminal = (
    <TerminalPanel
      embedded
      visible
      spawnShell={spawnShell}
      isReplay={timeline.isReplay}
      replayOutput={timeline.displayTerminal}
      onReady={handleTerminalReady}
      onLog={(data) => {
        // Basic error surfacing from terminal
        if (/error|Error|SyntaxError|failed|Failed/.test(data)) {
          reportProblem(data.trim().slice(0, 200));
        }
      }}
    />
  );

  const sessionPanel = (
    <SessionTimeline
      embedded
      store={timeline.store}
      eventCount={timeline.eventCount}
      viewIndex={timeline.viewIndex}
      headIndex={timeline.headIndex}
      isReplay={timeline.isReplay}
      onScrub={timeline.scrubTo}
      onStepBack={timeline.stepBack}
      onStepForward={timeline.stepForward}
      onReturnToLive={timeline.returnToLive}
    />
  );

  const packagesPanel = (
    <PackagesPanel
      files={files}
      onUpdateFile={(path, content) => {
        setFiles((prev: any) => ({ ...prev, [path]: content }));
      }}
      onLog={(data) => {
        // Stream to the main terminal output if available
        if (typeof appendLog === 'function') appendLog(data);
        else console.log('[packages]', data);
      }}
      embedded
    />
  );

  const handleGitHubImport = async (owner: string, repo: string, branch: string) => {
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const treeRes = await fetch(treeUrl);
    if (!treeRes.ok) {
      throw new Error(`Failed to fetch GitHub tree (status ${treeRes.status}). Repo may be private or rate-limited.`);
    }
    const treeData = await treeRes.json();
    const imported: Record<string, string> = {};
    let count = 0;
    for (const item of treeData.tree || []) {
      if (item.type === 'blob' && item.size < 300000) {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;
          const contentRes = await fetch(rawUrl);
          if (contentRes.ok) {
            const content = await contentRes.text();
            imported[item.path] = content;
            count++;
          }
        } catch {}
      }
    }
    if (count === 0) throw new Error('No files were imported (empty repo or only binary/large files).');
    setFiles(imported);
    onLog?.(`\r\n\x1b[36mImported ${count} files from github.com/${owner}/${repo}@${branch}\x1b[0m\r\n`);
    // If package.json was imported, user can use the Packages panel to npm install
    if (imported['package.json']) {
      onLog?.('package.json found — open the Packages tab to run npm install for dependencies.\r\n');
    }
  };

  const envPanel = (
    <EnvPanel
      files={files}
      onUpdateFile={(path, content) => {
        setFiles((prev: any) => ({ ...prev, [path]: content }));
      }}
      onImportFromGitHub={handleGitHubImport}
      embedded
    />
  );

  const [problems, setProblems] = React.useState<Problem[]>([]);

  const reportProblem = React.useCallback((message: string, file?: string, line?: number) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setProblems((prev) => [...prev, { id, message, file, line, type: 'error' }].slice(-20)); // keep last 20
  }, []);

  // Collect from hook error
  React.useEffect(() => {
    if (error) reportProblem(error);
  }, [error, reportProblem]);

  // Collect from AI
  React.useEffect(() => {
    if (ai.error) reportProblem(ai.error);
  }, [ai.error, reportProblem]);

  // Simple parser for terminal errors (look for common patterns in recent output)
  const recentTerminal = React.useMemo(() => {
    // In real use, we'd have access to full terminal history; here we sample from onLog calls if wired
    return ''; // placeholder - can be enhanced with a terminal log buffer
  }, []);

  React.useEffect(() => {
    // Example: if we had terminal lines, parse here
    // For now, this is a stub; real parsing can hook into the terminal's onLog
  }, [recentTerminal, reportProblem]);

  const problemsPanel = (
    <ProblemsPanel
      problems={problems}
      onSelect={(p) => {
        if (p.file) {
          // Try to open the file in editor
          // This assumes selectFile or similar is available; in full app it would focus the editor
          console.log('[Problems] Open file:', p.file, p.line);
          // TODO: integrate with selectFile(activePath) and scroll
        }
      }}
      onClear={() => setProblems([])}
      embedded
    />
  );

  const renderDock = (zone: DockZoneId) => (
    <WorkspaceDock
      zone={zone}
      activeTab={dockTab}
      onTabChange={setDockTab}
      dockedTabs={dockInZone(zone)}
      allTabsFloating={allDockFloated}
      terminal={terminal}
      timeline={sessionPanel}
      ai={<AiPatchPanel embedded ai={ai} />}
      packages={packagesPanel}
      env={envPanel}
      problems={problemsPanel}
      search={searchPanel}
      problemsCount={problems.length}
      onFloatTab={handleFloatTab}
      onDockTabToZone={(tab, z) => {
        workspace.dockTabToZone(tab, z);
        setDockTab(tab);
      }}
    />
  );

  const floatingPanels = floatingTabs.map((tab, i) => {
    const placement = workspace.layout.dock[tab];
    const rect = placement.rect!;
    const body =
      tab === 'timeline' ? sessionPanel : 
      tab === 'terminal' ? terminal : 
      tab === 'ai' ? <AiPatchPanel embedded ai={ai} /> : 
      tab === 'packages' ? packagesPanel :
      tab === 'env' ? envPanel :
      tab === 'problems' ? problemsPanel :
      searchPanel;
    return (
      <FloatingPanel
        key={tab}
        tabId={tab}
        title={FLOAT_TITLES[tab]}
        rect={rect}
        zIndex={60 + i}
        onRectChange={(r) => workspace.updateFloatRect(tab, r)}
        onDock={(zone) => {
          workspace.dockTabToZone(tab, zone);
          setDockTab(tab);
        }}
      >
        {body}
      </FloatingPanel>
    );
  });

  const topBar = (
    <TopBar
      status={status}
      templateId={templateId}
      previewUrl={previewUrl}
      onTemplateChange={handleTemplateChange}
      onRestart={handleRestart}
      onOpenPreview={() => previewUrl && window.open(previewUrl, '_blank')}
      onExport={() => exportProjectAsZip(files, `mini-blitz-${templateId}`)}
      onDeploy={() => {
        // Polish: hook for parent Bolt app to deploy (e.g. via DataSync or direct Vercel)
        console.log('[Deploy hook] Current files:', files);
        alert('Deploy hook called - integrate with your Bolt clone backend / Vercel API here.');
      }}
      inspectMode={inspectMode}
      onInspectModeChange={handleInspectModeChange}
      inspectDisabled={timeline.isReplay}
      onAccountClick={() => setAccountOpen(true)}
      accountActive={accountOpen}
      displayName={userAccount.account.profile.displayName}
      avatarUrl={userAccount.account.profile.avatarUrl}
      workspaceMenu={
        <WorkspaceMenu
          preview={workspace.layout.preview}
          panels={workspace.layout.panels}
          onPreviewChange={workspace.setPreviewLanes}
          onPanelChange={workspace.setPanelVisible}
          onReset={workspace.resetLayout}
        />
      }
    />
  );

  if (isMobile && accountOpen) {
    return (
      <div className="xai-shell">
        {topBar}
        <NativeAppBanner />
        <AccountWorkspace
          api={userAccount}
          onExit={() => setAccountOpen(false)}
          onSignOut={userAccount.signOut}
          onApplyDefaultTemplate={handleApplyDefaultTemplate}
          onOpenAskJeremy={() => {
            setAccountOpen(false);
            focusDock('ai');
            setMobilePanel('ai');
          }}
        />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="xai-shell">
        {topBar}
        <NativeAppBanner />
        <main className="mobile-workspace-main bg-xai-bg">
          {mobilePanel === 'files' && <div className="mobile-panel-pane">{explorer}</div>}
          {mobilePanel === 'editor' && <div className="mobile-panel-pane">{editor}</div>}
          {mobilePanel === 'preview' && <div className="mobile-panel-pane">{preview}</div>}
          {mobilePanel === 'terminal' && (
            <div className="mobile-panel-pane">
              <TerminalPanel
                visible
                spawnShell={spawnShell}
                isReplay={timeline.isReplay}
                replayOutput={timeline.displayTerminal}
                onReady={handleTerminalReady}
              />
            </div>
          )}
          {mobilePanel === 'timeline' && (
            <div className="mobile-panel-pane">
              <SessionTimeline
                store={timeline.store}
                eventCount={timeline.eventCount}
                viewIndex={timeline.viewIndex}
                headIndex={timeline.headIndex}
                isReplay={timeline.isReplay}
                onScrub={timeline.scrubTo}
                onStepBack={timeline.stepBack}
                onStepForward={timeline.stepForward}
                onReturnToLive={timeline.returnToLive}
              />
            </div>
          )}
          {mobilePanel === 'ai' && (
            <div className="mobile-panel-pane">
              <AiPatchPanel ai={ai} />
            </div>
          )}
        </main>
        <MobileNav
          active={mobilePanel}
          onChange={(panel) => {
            setMobilePanel(panel);
            if (panel === 'terminal') focusDock('terminal');
            if (panel === 'timeline') focusDock('timeline');
            if (panel === 'ai') focusDock('ai');
          }}
        />
      </div>
    );
  }

  return (
    <div className="xai-shell">
      {topBar}
      <NativeAppBanner />
      {accountOpen ? (
        <AccountWorkspace
          api={userAccount}
          onExit={() => setAccountOpen(false)}
          onSignOut={userAccount.signOut}
          onApplyDefaultTemplate={handleApplyDefaultTemplate}
          onOpenAskJeremy={() => {
            setAccountOpen(false);
            focusDock('ai');
          }}
        />
      ) : (
      <div className="workspace-main flex min-h-0 min-w-0 flex-1 bg-xai-bg">
        <ActivityRail
          explorerOpen={workspace.layout.panels.explorer}
          labOpen={isPreviewColumnVisible(workspace.layout.panels, workspace.layout.preview)}
          dockFocus={dockTab}
          onExplorer={handleRailExplorer}
          onLab={handleRailLab}
          onTerminal={() => focusDock('terminal')}
          onSession={() => focusDock('timeline')}
          onAsk={() => focusDock('ai')}
          terminalBadge={status === 'ready'}
          accountActive={false}
          onAccountClick={() => setAccountOpen(true)}
          avatarUrl={userAccount.account.profile.avatarUrl}
          displayName={userAccount.account.profile.displayName}
        />

        <PanelGroup direction="horizontal" className="min-h-0 min-w-0 flex-1">
          {workspace.layout.panels.explorer && (
            <>
              <Panel
                defaultSize={panelSizes.sidebar}
                minSize={14}
                maxSize={30}
                id="sidebar"
                collapsible
                collapsedSize={0}
              >
                <PanelGroup direction="vertical" className="h-full min-h-0">
                  <Panel
                    defaultSize={
                      sidebarDocked
                        ? getCompanionPanelSize(sidebarDockTabs, 'sidebar-below')
                        : 100
                    }
                    minSize={18}
                    id="explorer-main"
                  >
                    {explorer}
                  </Panel>
                  {sidebarDocked && (
                    <>
                      <PanelResizeHandle />
                      <Panel
                        key={`dock-sidebar-${sidebarDockTabs.join(',')}`}
                        defaultSize={getDockZonePanelSize(sidebarDockTabs, 'sidebar-below').defaultSize}
                        minSize={getDockZonePanelSize(sidebarDockTabs, 'sidebar-below').minSize}
                        maxSize={getDockZonePanelSize(sidebarDockTabs, 'sidebar-below').maxSize}
                        id="dock-sidebar"
                      >
                        {renderDock('sidebar-below')}
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>
              <PanelResizeHandle />
            </>
          )}

          <Panel
            defaultSize={
              showPreviewColumn
                ? workspace.layout.panels.explorer
                  ? panelSizes.center
                  : panelSizes.center + panelSizes.sidebar
                : 100
            }
            minSize={32}
            id="center"
          >
            <PanelGroup direction="vertical" className="h-full min-h-0">
              {editorAboveDocked && (
                <>
                  <Panel
                    key={`dock-editor-above-${editorAboveDockTabs.join(',')}`}
                    defaultSize={getDockZonePanelSize(editorAboveDockTabs, 'editor-above').defaultSize}
                    minSize={getDockZonePanelSize(editorAboveDockTabs, 'editor-above').minSize}
                    maxSize={getDockZonePanelSize(editorAboveDockTabs, 'editor-above').maxSize}
                    id="dock-editor-above"
                  >
                    {renderDock('editor-above')}
                  </Panel>
                  <PanelResizeHandle />
                </>
              )}
              <Panel
                defaultSize={getCenterEditorSize(
                  editorAboveDockTabs,
                  bottomDockTabs,
                  allDockFloated,
                  panelSizes.dock
                )}
                minSize={30}
                id="editor"
              >
                {editor}
              </Panel>
              {showBottomPanel && (
                <>
                  <PanelResizeHandle />
                  <Panel
                    key={`dock-bottom-${bottomDockTabs.join(',')}`}
                    ref={dockPanelRef}
                    defaultSize={allDockFloated ? 13 : bottomDockSize.defaultSize}
                    minSize={allDockFloated ? 11 : bottomDockSize.minSize}
                    maxSize={allDockFloated ? 18 : bottomDockSize.maxSize}
                    id="dock-bottom"
                    collapsible
                    collapsedSize={0}
                  >
                    {renderDock('bottom')}
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {showPreviewColumn && (
            <>
              <PanelResizeHandle />
              <Panel
                defaultSize={panelSizes.preview}
                minSize={20}
                id="preview"
                collapsible
                collapsedSize={0}
              >
                <PanelGroup direction="vertical" className="h-full min-h-0 border-l border-xai-border-subtle">
                  {previewAboveDocked && (
                    <>
                      <Panel
                        key={`dock-preview-above-${previewAboveDockTabs.join(',')}`}
                        defaultSize={
                          getDockZonePanelSize(previewAboveDockTabs, 'preview-above').defaultSize
                        }
                        minSize={getDockZonePanelSize(previewAboveDockTabs, 'preview-above').minSize}
                        maxSize={getDockZonePanelSize(previewAboveDockTabs, 'preview-above').maxSize}
                        id="dock-preview-above"
                      >
                        {renderDock('preview-above')}
                      </Panel>
                      <PanelResizeHandle />
                    </>
                  )}
                  <Panel
                    defaultSize={getPreviewMainSize(previewAboveDockTabs, previewBelowDockTabs)}
                    minSize={24}
                    id="preview-main"
                  >
                    {preview}
                  </Panel>
                  {previewBelowDocked && (
                    <>
                      <PanelResizeHandle />
                      <Panel
                        key={`dock-preview-below-${previewBelowDockTabs.join(',')}`}
                        defaultSize={
                          getDockZonePanelSize(previewBelowDockTabs, 'preview-below').defaultSize
                        }
                        minSize={getDockZonePanelSize(previewBelowDockTabs, 'preview-below').minSize}
                        maxSize={getDockZonePanelSize(previewBelowDockTabs, 'preview-below').maxSize}
                        id="dock-preview-below"
                      >
                        {renderDock('preview-below')}
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>
            </>
          )}
        </PanelGroup>
        {floatingPanels}
      </div>
      )}
    </div>
  );
}

export default function App() {
  const userAccount = useUserAccount();

  return (
    <AccountNotificationProvider preferences={userAccount.account.notifications}>
      <DockMotionProvider>
        <AppWorkspace userAccount={userAccount} />
        <DockZoneDropOverlay />
        <DockDragPreview />
      </DockMotionProvider>
    </AccountNotificationProvider>
  );
}