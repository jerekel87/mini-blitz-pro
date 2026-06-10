# Mini-Blitz IDE Web Container

**Premium in-browser IDE** — built on WebContainer API with real Node.js, `npm install`, and Vite dev server in the browser.

This is the **core embeddable IDE** for a Bolt.new-style clone. The root-level simple static bundler has been deprecated and moved to `../simple/`. All development and embedding now focuses here.

## Embedding into your Bolt.new clone

The primary goal is to **inject** this WebContainer-powered IDE into your main app builder (e.g. as a React component or iframe).

### Recommended embedding (same bundle / React)
Import the core logic and render a controlled IDE:

```tsx
import { MiniBlitzEmbed } from './mini-blitz/advanced/src/embed'; // or build as package

<MiniBlitzEmbed
  initialFiles={aiGeneratedFiles}           // from your AI / DataSync
  templateId="react-vite-tailwind"
  onFilesChange={(files) => saveToBackend(files)}
  onPreviewReady={(url) => setPreviewUrl(url)}
  onTerminalOutput={(line) => logToBoltUI(line)}
  embedded={true}                           // hides some chrome
  showAiPanel={true}
  showTimeline={true}
  showEnv={true}
/>
```

Imperative control is also available via ref:

```tsx
const ideRef = useRef<MiniBlitzHandle>(null);

ideRef.current?.loadProject(newFilesFromAI);
const current = await ideRef.current?.getFiles();
ideRef.current?.applyAiPatch("add dark mode");
ideRef.current?.exportProject("my-generated-app"); // downloads clean ZIP
// or from the top bar "Export" button in standalone advanced mode
```

### New in this update: Env + GitHub Import (features 3 & 4)
- Dedicated **Env** dock tab for editing .env* files (key/value editor for multiple .env files, auto-saves to WebContainer).
- **GitHub Import** integrated in the Env panel: enter owner/repo/branch (public repos) to fetch the file tree + raw contents and load into the current project (overwrites paths; suggests using Packages tab afterward if package.json is present).
- **Problems** tab (feature #5): Collects and surfaces errors/warnings from the dev server, AI patches, terminal output, and previews. Clickable entries (future: jump to file/line). Badge/count support in dock. Basic parser for terminal errors + hook/AI error collection. Exposed in embed via showProblems.
- **Search** tab (feature #6): Global find across all project files with regex/case/whole-word options. Results grouped by file with line snippets and match highlight. Click to open file at match. Find & Replace (per-file or "Replace all"). Monaco editor's built-in find (Ctrl/Cmd+F) still works for single file. Exposed via showSearch in embed.
- **Export** (feature #7): "Export" button in top bar (and via handle.exportProject(name?) in embed) downloads the current project as a clean ZIP (excludes node_modules, dist, .git, build artifacts, etc.). Ideal for taking a generated app out of the IDE or sharing.
- **Polish items addressed** (run through all from earlier list):
  - Badge/count on Problems tab (red badge when >0 errors, passed via problemsCount).
  - Auto-zip / export hook on AI apply (commented example in onApply for Bolt clone iteration snapshots; parent can trigger via onFilesChange + export).
  - More templates (added Svelte + Vue + TS; easy to extend in templates.ts).
  - Deployment hooks (placeholder "Deploy" button in TopBar + onDeploy prop; integrate in parent Bolt with DataSync or direct Vercel/Netlify API using current files).
  - Search polish (click-to-open in editor; can be extended to highlight matches in dual previews via inspector postMessage).
  - Tighter DataSync integration (rich on* events: onFilesChange, onPreviewReady, onTerminalOutput, onError, onAiPatchStatus; onExport/onDeploy for parent to persist to backend or trigger deploys; loadProject/applyPatch for AI flows from Bolt chat).
  - Richer devtools (terminal for shell/logs + Problems tab for errors/warnings from WC/AI/terminal/preview; preview inspector for element-to-code).
  - Mobile/responsive tweaks (existing MobileNav + Capacitor for Android; embed supports responsive parent layouts via embedded=true + show* props to hide chrome).
  - Other: Problems onClear and select hooks; search supports regex/whole-word/case; Env + GitHub tied together; export clean for "download this AI version".
- Features 3–7 + all polish are fully wired in the main advanced app and exposed in the embed component (via show* props and MiniBlitzHandle methods).

These are wired for both the full advanced app and the embed component.

### Iframe / cross-origin embedding (postMessage)
Build the advanced app and iframe it. A postMessage protocol is available (see src/embed/postMessageBridge.ts) for:
- `loadProject`
- `getFiles`
- `applyAiPatch`
- Events back to parent (filesChanged, previewReady, etc.)

> **Note for Bolt.new clones**: Use the AI Surgeon + timeline features to let your AI safely propose and apply changes inside the live preview. The dual-reality (Instant vs Truth) preview is particularly useful for fast feedback vs real execution. Env vars and GitHub import help when your AI generates full projects that depend on secrets or starter repos.

## Stack (for embedders)

- **WebContainer** — Node/npm in the browser (the heart of the "live" experience)
- **Monaco Editor** + **xterm.js**
- React + Vite + TypeScript templates (easily extensible)
- Built-in AI patch system, session timeline, dual previews, and parallel universes

These advanced features are designed to be **controlled by your parent Bolt.new clone** (via the embedding API).

## Requirements

WebContainer needs **cross-origin isolation**. The Vite dev server sets:

- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`

Use **Chrome or Edge** (latest). Firefox/Safari have limited support.

## Quick start

```bash
cd advanced
npm install
npm run dev
```

First project boot runs `npm install` inside WebContainer (~30–60s), then `npm run dev`. Preview loads the live Vite URL automatically.

## Templates

| Template | Description |
|----------|-------------|
| React + Vite + TS + Tailwind | Full starter with Tailwind |
| React + Vite + TypeScript | React without Tailwind |
| Vanilla + Vite + TypeScript | No framework |

## AI Surgeon (surgical patches)

Describe **one** change in the AI panel → model returns a minimal multi-file patch → you review line diffs → **Apply** or **Reject**.

- Uses an OpenAI-compatible API (`gpt-4o-mini` by default)
- API key in panel settings or `VITE_AI_API_KEY` in `.env`
- **Grok (xAI):** Base URL `https://api.x.ai/v1`, model e.g. `grok-3-mini` — use “Grok preset” in settings
- `api.openai.com` and `api.x.ai` requests go through the Vite dev proxy (fixes browser “Failed to fetch” / CORS)
- You must run via `npm run dev` (not `file://` or static python server) for AI Surgeon
- Apply syncs to WebContainer + records an `ai_patch` timeline event
- Failed apply **rolls back** to the pre-patch snapshot

## Session timeline (IDE DVR)

Every session records a scrubbable timeline:

- **File snapshots** — debounced on edit (full project state)
- **Terminal output** — npm install, dev server logs
- **Boot status** — WebContainer lifecycle
- **Dual reality** — Instant vs Truth alignment changes

Scrub backward/forward to restore editor, terminal, Instant preview, and sync files into WebContainer (Truth HMR). **Return to live** jumps back to the latest state.

Desktop: timeline panel below the terminal. Mobile: **Time** tab in the bottom nav.

## Preview-native navigation

- **Alt+click** any React element in Instant or Truth preview → editor jumps to that file & line (normal clicks still interact with the app)
- **Hover** (move cursor) in the editor → matching nodes highlight in both previews
- Requires `blitz-inspector.js` (auto-injected into templates)

## Dual reality preview

Every edit updates two previews side by side:

- **Instant** — in-browser bundler (~50ms), approximates static/TS/React via CDN + Babel
- **Truth** — real WebContainer `npm install` + Vite dev server

A status bar shows alignment: *Aligned*, *Instant ahead*, *Diverged* (e.g. Tailwind only works in Truth), etc.

## Parallel universe lab (#5)

Compare **Universe A** vs **Universe B** from one project without opening two tabs:

| Control | What it does |
|---------|----------------|
| **Fork Universe B** | Snapshot current A into an independent B copy |
| **Universe A / B** | Switch which reality the editor and Truth preview follow |
| **A — Instant / B — Instant** | Side-by-side ~50ms previews (always both visible after fork) |
| **Truth** | Real Vite dev server for the **active** universe only |
| **B presets** | One-click variants (violet CTA, alt copy, high contrast) on `src/App.tsx` |
| **Promote B → A** | Replace live project with B and sync WebContainer |
| **Reset B** | Re-copy A into B |
| **Violet dots** in Explorer | Files that differ between A and B |

AI **Apply** automatically snapshots pre-patch A into B when B already exists, so you can compare before/after an AI change.

Lab is disabled during timeline replay (Return to live to use it again).

## Mobile

On viewports ≤768px, bottom navigation switches between Files, Editor, Dual preview, and Terminal.

## Simple mode

The original static bundler IDE (no WebContainer) lives at [../index.html](../index.html).
