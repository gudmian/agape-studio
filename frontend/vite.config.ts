import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), '');
  const cmsToken = env.VITE_CMS_TOKEN?.trim();

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        /** Локальный Directus: тот же origin + при необходимости Bearer для /assets (у <img> нет заголовков). */
        '/cms-directus': {
          target: 'http://127.0.0.1:8055',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/cms-directus/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (cmsToken) {
                proxyReq.setHeader('Authorization', `Bearer ${cmsToken}`);
              }
            });
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react';
            }
          },
        },
      },
    },
  };
});
