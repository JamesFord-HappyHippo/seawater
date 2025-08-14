import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/frontend/src'),
      '@components': path.resolve(__dirname, './src/frontend/src/components'),
      '@features': path.resolve(__dirname, './src/frontend/src/features'),
      '@contexts': path.resolve(__dirname, './src/frontend/src/contexts'),
      '@api': path.resolve(__dirname, './src/frontend/src/api'),
      '@utils': path.resolve(__dirname, './src/frontend/src/utils'),
      '@hooks': path.resolve(__dirname, './src/frontend/src/hooks'),
      '@pages': path.resolve(__dirname, './src/frontend/src/pages'),
      '@types': path.resolve(__dirname, './src/frontend/src/types'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/frontend/src/test/setup.ts'],
  },
})