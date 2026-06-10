import type { ProjectTemplate, TemplateId } from '../types';
import { withInspectorFile } from './previewInspector';

const VITE_CONFIG_REACT = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
});
`;

const VITE_CONFIG_VANILLA = `import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, host: true },
});
`;

const TSCONFIG = `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}`;

const TSCONFIG_APP = `{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}`;

const TSCONFIG_NODE = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`;

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mini Blitz App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

const REACT_TAILWIND_FILES: Record<string, string> = {
  'index.html': INDEX_HTML,
  'vite.config.ts': VITE_CONFIG_REACT,
  'tsconfig.json': TSCONFIG,
  'tsconfig.app.json': TSCONFIG_APP,
  'tsconfig.node.json': TSCONFIG_NODE,
  'postcss.config.js': `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};`,
  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};`,
  'src/vite-env.d.ts': `/// <reference types="vite/client" />\n`,
  'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply min-h-screen bg-slate-950 text-slate-100 antialiased;
}
`,
  'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
  'src/App.tsx': `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl backdrop-blur">
        <h1 className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-3xl font-bold text-transparent">
          Mini Blitz + WebContainer
        </h1>
        <p className="mt-2 text-slate-400">
          Real Vite dev server running inside your browser.
        </p>
        <p className="mt-6 text-center text-2xl font-mono text-cyan-300">{count}</p>
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="mt-4 w-full rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          Increment
        </button>
      </div>
    </main>
  );
}
`,
};

// Fix package.json - I made a mess with duplicate deps. Let me fix in templates file properly.
REACT_TAILWIND_FILES['package.json'] = JSON.stringify(
  {
    name: 'vite-react-tailwind',
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc -b && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    },
    devDependencies: {
      '@types/react': '^18.3.18',
      '@types/react-dom': '^18.3.5',
      '@vitejs/plugin-react': '^4.3.4',
      autoprefixer: '^10.4.20',
      postcss: '^8.4.49',
      tailwindcss: '^3.4.17',
      typescript: '~5.6.3',
      vite: '^6.0.5',
    },
  },
  null,
  2
);

/** Standalone — no postcss/tailwind configs (Vite auto-loads postcss.config.js if present). */
const REACT_VITE_FILES: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'vite-react',
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'tsc -b && vite build', preview: 'vite preview' },
      dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
      devDependencies: {
        '@types/react': '^18.3.18',
        '@types/react-dom': '^18.3.5',
        '@vitejs/plugin-react': '^4.3.4',
        typescript: '~5.6.3',
        vite: '^6.0.5',
      },
    },
    null,
    2
  ),
  'index.html': INDEX_HTML,
  'vite.config.ts': VITE_CONFIG_REACT,
  'tsconfig.json': TSCONFIG,
  'tsconfig.app.json': TSCONFIG_APP,
  'tsconfig.node.json': TSCONFIG_NODE,
  'src/vite-env.d.ts': `/// <reference types="vite/client" />\n`,
  'src/index.css': `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0f172a;
  color: #e2e8f0;
}
`,
  'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
  'src/App.tsx': `import { useState } from 'react';

export default function App() {
  const [n, setN] = useState(0);
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>React + Vite + TypeScript</h1>
      <p>Count: {n}</p>
      <button onClick={() => setN((x) => x + 1)}>+1</button>
    </div>
  );
}
`,
};

const VANILLA_VITE_FILES: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'vite-vanilla',
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
      devDependencies: { typescript: '~5.6.3', vite: '^6.0.5' },
    },
    null,
    2
  ),
  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vanilla Vite</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
  'vite.config.ts': VITE_CONFIG_VANILLA,
  'tsconfig.json': TSCONFIG,
  'tsconfig.app.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["src"]
}`,
  'tsconfig.node.json': TSCONFIG_NODE,
  'src/main.ts': `import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = \`
  <main class="hero">
    <h1>Vanilla Vite + TypeScript</h1>
    <p>Powered by WebContainer in your browser.</p>
    <button id="btn" type="button">Say hello</button>
    <p id="msg"></p>
  </main>
\`;

document.getElementById('btn')!.addEventListener('click', () => {
  const msg = document.getElementById('msg')!;
  msg.textContent = 'Hello from WebContainer!';
  console.log('clicked');
});
`,
  'src/style.css': `* { box-sizing: border-box; margin: 0; }

body {
  font-family: system-ui, sans-serif;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #1e1b4b, #0f172a);
  color: #e2e8f0;
}

.hero {
  text-align: center;
  padding: 2rem;
  background: rgba(255,255,255,0.06);
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.1);
}

h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }

button {
  margin-top: 1rem;
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 8px;
  background: #6366f1;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

button:hover { background: #818cf8; }

#msg { margin-top: 1rem; color: #a5b4fc; }
`,
};

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'react-vite-tailwind',
    name: 'React + Vite + TS + Tailwind',
    description: 'Full-stack frontend starter with Tailwind CSS',
    files: REACT_TAILWIND_FILES,
  },
  {
    id: 'react-vite',
    name: 'React + Vite + TypeScript',
    description: 'React 18 with Vite and TypeScript',
    files: REACT_VITE_FILES,
  },
  {
    id: 'vanilla-vite',
    name: 'Vanilla + Vite + TypeScript',
    description: 'TypeScript without a framework',
    files: VANILLA_VITE_FILES,
  },
  {
    id: 'svelte-vite',
    name: 'Svelte + Vite + TS',
    description: 'Svelte 4 with Vite and TypeScript',
    files: {
      'package.json': JSON.stringify({
        name: 'svelte-vite',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
        devDependencies: {
          '@sveltejs/vite-plugin-svelte': '^3.0.0',
          '@tsconfig/svelte': '^5.0.0',
          svelte: '^4.2.0',
          typescript: '~5.6.3',
          vite: '^6.0.5',
        },
      }, null, 2),
      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Svelte + Vite + TS</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
      'vite.config.ts': `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: { port: 5173, host: true },
});`,
      'tsconfig.json': `{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true
  },
  "include": ["src/**/*", "src/**/*.d.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
      'tsconfig.node.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`,
      'src/vite-env.d.ts': `/// <reference types="vite/client" />\n`,
      'src/main.ts': `import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

const app = mount(App, {
  target: document.getElementById('app')!
});

export default app;`,
      'src/App.svelte': `<script lang="ts">
  let count = $state(0);
</script>

<main>
  <h1>Svelte + Vite + TS</h1>
  <p>Powered by WebContainer.</p>
  <button on:click={() => count++}>count is {count}</button>
</main>

<style>
  main { text-align: center; padding: 2rem; }
</style>`,
      'src/app.css': `body { font-family: system-ui; background: #0f172a; color: #e2e8f0; }`,
    },
  },
  {
    id: 'vue-vite',
    name: 'Vue + Vite + TS',
    description: 'Vue 3 with Vite and TypeScript',
    files: {
      'package.json': JSON.stringify({
        name: 'vue-vite',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
        dependencies: { vue: '^3.4.0' },
        devDependencies: {
          '@vitejs/plugin-vue': '^5.0.0',
          typescript: '~5.6.3',
          vite: '^6.0.5',
          'vue-tsc': '^2.0.0',
        },
      }, null, 2),
      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue + Vite + TS</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
      'vite.config.ts': `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, host: true },
});`,
      'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "preserve",
    "strict": true
  },
  "include": ["src/**/*", "src/**/*.d.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
      'tsconfig.node.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`,
      'src/vite-env.d.ts': `/// <reference types="vite/client" />\n`,
      'src/main.ts': `import { createApp } from 'vue';
import './style.css';
import App from './App.vue';

createApp(App).mount('#app');`,
      'src/App.vue': `<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
</script>

<template>
  <main>
    <h1>Vue + Vite + TS</h1>
    <p>Powered by WebContainer.</p>
    <button @click="count++">count is {{ count }}</button>
  </main>
</template>

<style scoped>
main { text-align: center; padding: 2rem; }
</style>`,
      'src/style.css': `body { font-family: system-ui; background: #0f172a; color: #e2e8f0; }`,
    },
  },
];

export function getTemplate(id: TemplateId): ProjectTemplate {
  const t = TEMPLATES.find((item) => item.id === id) ?? TEMPLATES[0];
  return {
    ...t,
    files: withInspectorFile(t.files, 'truth'),
  };
}