import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path-browserify'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Try adding this if the error persists
      '../internals/define-globalThis-property': require.resolve('@mui/material/internals/define-globalThis-property'),
    },
  },
});
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(new URL('./src', import.meta.url).pathname),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://0.0.0.0:5000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Try adding this if the error persists
      '../internals/define-globalThis-property': require.resolve('@mui/material/internals/define-globalThis-property'),
    },
  },
});