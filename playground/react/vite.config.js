import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fairyPolish from '../../vite-plugin/index.js'

export default defineConfig({
  plugins: [react(), fairyPolish()],
  server: { port: 5287 },
})
