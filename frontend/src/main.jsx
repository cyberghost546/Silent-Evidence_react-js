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
