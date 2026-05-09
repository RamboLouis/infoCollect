import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { apps } = require('../ecosystem.config.js')
const PORT = apps[0].env.PORT

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5188,
    proxy: {
      '/api': {
        target: `http://localhost:${PORT}`,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache'
              proxyRes.headers['x-accel-buffering'] = 'no'
            }
          })
        },
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
