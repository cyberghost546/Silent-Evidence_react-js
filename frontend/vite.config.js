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
  // Settings for the tests (npm test). Vitest reads them from here.
  test: {
    // jsdom = a pretend browser inside Node, so components can render
    // without opening Chrome.
    environment: 'jsdom',
    // Runs before every test file (src/test/setup.js).
    setupFiles: './src/test/setup.js',
    // Don't try to load CSS in tests - it's not needed and slows them down.
    css: false,
    // Typing into forms is simulated key by key; when all test files
    // run at once that can take longer than the default 5 seconds.
    testTimeout: 15000,
  },
})
