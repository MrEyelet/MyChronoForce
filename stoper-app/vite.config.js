import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relatywne ścieżki, żeby działało pod /MyChronoForce/
  base: './',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
})
