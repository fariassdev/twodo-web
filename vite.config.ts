import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@tanstack/react-router')) return 'vendor-router';
            if (
              id.includes('@tanstack/react-query') ||
              id.includes('@tanstack/react-query-persist-client') ||
              id.includes('@tanstack/query-async-storage-persister')
            ) return 'vendor-query';
            if (
              id.includes('i18next') ||
              id.includes('react-i18next') ||
              id.includes('i18next-browser-languagedetector')
            ) return 'vendor-i18n';
            if (
              id.includes('@supabase/supabase-js') ||
              id.includes('idb-keyval')
            ) return 'vendor-supabase';
          },
        },
      },
    },
  };
});
