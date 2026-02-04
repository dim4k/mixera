import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: './',

  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    },
    hmr: {
      clientPort: 5173
    },
    // Proxies to bypass CORS (Only for local dev now)
    proxy: {
      '/api/deezer': { 
        target: 'https://api.deezer.com', 
        changeOrigin: true, 
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/deezer/, '') 
      }
    }

  }
}))
