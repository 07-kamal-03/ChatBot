import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Allow access from within the cluster
    port: 5174,       // Match the service port
    strictPort: true,
    allowedHosts: ['.ngrok-free.app'],
  }
})

