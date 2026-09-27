import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'


// ---------------------------------------------------------------
// The frame around EVERY dashboard page: sidebar on the left,
// the current page on the right.
//
// <Outlet /> is a placeholder. React Router puts the matching
// child route there (see App.jsx):
//   /dashboard         -> <Overview />
//   /dashboard/slides  -> <SlideDashboard />
//   /dashboard/users   -> <UsersDashboard />
//   /dashboard/stories -> <StoriesDashboard />
//   ...and the other pages listed in App.jsx
//
// So the sidebar is written once, and every new dashboard page
// gets it for free.
//
// ON PHONES there's no room for a 240px sidebar next to the page, so
// it's hidden: a bar at the top has a ☰ button that slides it in
// (menuOpen). Picking a page, the ×, or tapping the dark background
// closes it again. From the "lg" size up, the sidebar is always there.
//
// <Suspense>: the admin pages are loaded "lazily" (see App.jsx) -
// the first time you open one, its file still has to download.
// Meanwhile Suspense shows the `fallback`. The sidebar stays put.
// ---------------------------------------------------------------
function DashboardLayout() {
    const [menuOpen, setMenuOpen] = useState(false)
    const closeMenu = () => setMenuOpen(false)

    return (
        <div className='flex min-h-screen bg-gray-950 text-white'>
            <Sidebar open={menuOpen} onClose={closeMenu} />

            {/* The dark see-through background behind the open drawer
                (phones only). Tapping it closes the menu. */}
            {menuOpen && <div onClick={closeMenu} aria-hidden='true' className='fixed inset-0 z-30 bg-black/60 lg:hidden' />}

            {/* flex-1 = take all the width the sidebar doesn't use.
                min-w-0 stops wide content (like a long table) from
                stretching the page sideways. */}
            <div className='min-w-0 flex-1'>
                {/* ---------- PHONE TOP BAR (hidden from lg up) ---------- */}
                <div className='sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-gray-950/95 px-4 py-3 lg:hidden'>
                    <button type='button' onClick={() => setMenuOpen(true)} aria-label='Open menu' aria-expanded={menuOpen} className='rounded-lg p-1.5 text-gray-300 hover:bg-gray-800 hover:text-white'>
                        <Menu className='h-6 w-6' />
                    </button>
                    <span className='font-bold text-red-600'>Admin Panel</span>
                </div>

                {/* Less padding on phones, where every pixel counts. */}
                <main className='p-4 sm:p-8'>
                    <Suspense fallback={<p className='text-gray-400'>Loading...</p>}>
                        <Outlet />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout
