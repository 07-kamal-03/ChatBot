import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,  // Ensure this matches your Vite server port
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: ['.ngrok-free.app'],  // Allow all ngrok subdomains
  },
})
