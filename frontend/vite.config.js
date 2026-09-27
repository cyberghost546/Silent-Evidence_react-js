import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Django makes /sitemap.xml and /robots.txt (dashboard/seo_views.py).
    // Search engines look for them on the SITE's address, so while
    // developing, Vite passes those two to Django on port 8000.
    // (On a real server, the web server does the same job.)
    proxy: {
      '/sitemap.xml': 'http://localhost:8000',
      '/robots.txt': 'http://localhost:8000',
    },
  },
})
