import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
// Only Tailwind - see the note in index.css for why Bootstrap is gone.
import './index.css'
import App from './App.jsx'
import { setupErrorReporting } from './utils/errorReporting'

// Crashes nobody caught -> Dashboard -> Error Log.
setupErrorReporting()

// The service worker (public/sw.js) makes the site an installable,
// fast-opening app with an offline page. ONLY in the built site
// (import.meta.env.PROD is true after `npm run build`): while
// developing, a cache would keep showing you old code.
// 'load' = wait until the page itself has loaded, so registering
// doesn't slow down the first visit.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.error('Service worker failed:', err))
  })
}

// BrowserRouter wraps the whole app so any component inside can use
// <Routes>, <Route> and <Link>. It watches the address bar.
//
// AuthProvider wraps it too, so any component can call useAuth() to
// find out who's logged in.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
