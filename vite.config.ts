import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 4040,
    host: '127.0.0.1'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
