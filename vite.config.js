import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // NOTE: no `base` override — the site is hosted at a root domain (Vercel).
  // A subpath base like '/Nexura-Portal/' makes the built index.html request
  // assets from /Nexura-Portal/assets/... which 404s on root-domain hosts.
})
