import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["unpleased-tactless-devious.ngrok-free.dev"],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
      },
      // Proxy ALL api.peec.ai requests through Vite to bypass CORS.
      // This covers /mcp, /.well-known/*, /register, /token, /authorize, /revoke
      '/peec-api': {
        target: 'https://api.peec.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/peec-api/, ''),
        secure: true,
      },
    },
  },
})
