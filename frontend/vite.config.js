import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: [
      'ota-integration-lab.preview.emergentagent.com',
      'ota-integration-lab.cluster-0.preview.emergentcf.cloud',
      '.emergentagent.com',
      '.emergentcf.cloud',
      'localhost',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
