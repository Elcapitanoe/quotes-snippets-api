import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    rollupOptions: {
      input: './index.html'
    },
    assetsDir: 'assets'
  },
  server: {
    port: 3000,
    open: true
  },
  base: './',
  publicDir: 'public'
})