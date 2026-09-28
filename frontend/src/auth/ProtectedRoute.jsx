import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'


// ---------------------------------------------------------------
// A "guard" you wrap around a page in App.jsx:
//
//   <ProtectedRoute>            -> must be logged in
//   <ProtectedRoute adminOnly>  -> must be logged in AND an admin
//
// It checks, and either shows the page (children) or sends you away.
//
// Remember this only hides the PAGE. The real protection is in
// Django (IsAdminUser) - anyone can open the browser's dev tools and
// call the API directly, so the backend must check too.
// ---------------------------------------------------------------
function ProtectedRoute({ children, adminOnly = false }) {
    const { user, loading } = useAuth()

    // Where we are right now, e.g. "/dashboard".
    const location = useLocation()

    // Still asking Django - don't decide yet.
    if (loading) {
        return <p className='text-white text-center py-20'>Loading...</p>
    }

    if (!user) {
        // <Navigate> is a redirect you can return from a component.
        // state={{ from }} remembers where you were going, so the
        // Log In page can send you back here afterwards.
        // replace = don't add /dashboard to the back-button history,
        // or pressing Back would just bounce you to /login again.
        // pathname + search: keep ?text=... (shared from another app) through the log-in.
        return <Navigate to='/login' replace state={{ from: location.pathname + location.search }} />
    }

    if (adminOnly && !user.is_staff) {
        return <p className='text-white text-center py-20'>Only admins can see this page.</p>
    }

    return children
}

export default ProtectedRoute
