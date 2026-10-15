import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Shared SmartIAM backend (Security Team portal lives on a separate site).
      '/api': 'http://localhost:4000',
    },
  },
})
