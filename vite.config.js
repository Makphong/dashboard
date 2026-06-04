import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(process.cwd(), 'frontend'),
  publicDir: resolve(process.cwd(), 'frontend/public'),
  plugins: [react()],
  build: {
    outDir: resolve(process.cwd(), 'frontend/dist'),
    emptyOutDir: true,
    manifest: true,
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('react-dom') || id.includes('scheduler')) {
            return 'react-vendor';
          }
          if (id.includes('/recharts/') || id.includes('/d3-')) {
            return 'chart-vendor';
          }
          if (id.includes('/lucide-react/')) {
            return 'icon-vendor';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
