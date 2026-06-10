import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const crossOriginHeaders = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: crossOriginHeaders,
    proxy: {
      '/api/ai-proxy': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai-proxy/, '/v1'),
      },
      '/api/xai-proxy': {
        target: 'https://api.x.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/xai-proxy/, '/v1'),
      },
    },
  },
  preview: {
    headers: crossOriginHeaders,
    proxy: {
      '/api/ai-proxy': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai-proxy/, '/v1'),
      },
      '/api/xai-proxy': {
        target: 'https://api.x.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/xai-proxy/, '/v1'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@webcontainer/api'],
  },
});