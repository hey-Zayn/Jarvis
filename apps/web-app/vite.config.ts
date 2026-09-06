import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  server: {
    // Listen on every local interface so the app works from localhost and
    // 127.0.0.1 (and from another device during local development).
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/auth': 'http://localhost:5000',
      '/agent': 'http://localhost:5000',
      '/worker': 'http://localhost:5000',
    },
  },
  build: { outDir: 'dist', sourcemap: true },
});
