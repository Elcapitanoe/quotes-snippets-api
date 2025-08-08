import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: './index.html'
    },
    assetsDir: 'assets',
    minify: true
  },
  server: {
    port: 3000,
    open: true
  },
  base: '/',
  publicDir: 'public'
})