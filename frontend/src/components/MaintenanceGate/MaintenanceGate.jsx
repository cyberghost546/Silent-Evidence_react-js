import { Link, useLocation } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSiteStatus } from '../../hooks/useSiteStatus'


// ---------------------------------------------------------------
// MAINTENANCE SCREEN (and the "blocked" screen for IPs on the
// IP Blocklist). Wraps all the pages in App.jsx.
//
// When an admin switches on maintenance mode (Dashboard -> Site
// Settings), everybody who ISN'T staff sees this screen instead of
// the site. The Log In page still works, so admins can get in.
//
// This screen is only the friendly part - Django ALSO refuses the
// API during maintenance (dashboard/middleware.py). Hiding things
// in React alone isn't security: anyone can call the API directly.
// ---------------------------------------------------------------
function MaintenanceGate({ children }) {
    const site = useSiteStatus()
    const { user } = useAuth()
    const { pathname } = useLocation()

    // Blocked IP (Dashboard -> IP Blocklist): nothing works for them,
    // so a clear message beats a site full of loading errors.
    if (site?.blocked) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-[#020617] px-4'>
                <div className='w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center'>
                    <p className='text-2xl font-extrabold text-red-600'>Silent Evidence</p>
                    <h1 className='mt-6 text-xl font-bold text-white'>Access blocked</h1>
                    <p className='mt-2 text-sm text-gray-400'>Access from your network has been blocked. If you think this is a mistake, contact the site team.</p>
                </div>
            </div>
        )
    }

    // Log In and the two "forgot password" pages stay open, so admins
    // can always get in.
    const openPage = pathname === '/login' || pathname === '/forgot-password' || pathname.startsWith('/reset-password/')
    const showScreen = site?.maintenance_mode && !user?.is_staff && !openPage
    if (!showScreen) return children

    return (
        <div className='flex min-h-screen items-center justify-center bg-[#020617] px-4'>
            <div className='w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl shadow-red-950/40'>
                <p className='text-2xl font-extrabold text-red-600'>Silent Evidence</p>
                <Wrench className='mx-auto mt-6 h-10 w-10 text-red-500' />
                <h1 className='mt-4 text-xl font-bold text-white'>Down for maintenance</h1>
                <p className='mt-2 text-sm text-gray-400'>{site.maintenance_message}</p>
                <p className='mt-8 text-xs text-gray-500'>
                    Staff member? <Link to='/login' className='text-red-400 hover:text-red-300'>Log in</Link>
                </p>
            </div>
        </div>
    )
}

export default MaintenanceGate
