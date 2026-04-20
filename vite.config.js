import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy MCP requests through Vite dev server to bypass CORS
    proxy: {
      '/peec-mcp': {
        target: 'https://api.peec.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/peec-mcp/, '/mcp'),
        secure: true,
      },
    },
  },
})
