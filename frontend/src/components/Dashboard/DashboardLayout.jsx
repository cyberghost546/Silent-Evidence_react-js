import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
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
// <Suspense>: the admin pages are loaded "lazily" (see App.jsx) -
// the first time you open one, its file still has to download.
// Meanwhile Suspense shows the `fallback`. The sidebar stays put.
// ---------------------------------------------------------------
function DashboardLayout() {
    return (
        <div className='flex min-h-screen bg-gray-950 text-white'>
            <Sidebar />

            {/* flex-1 = take all the width the sidebar doesn't use.
                min-w-0 stops wide content (like a long table) from
                stretching the page sideways. */}
            <main className='min-w-0 flex-1 p-8'>
                <Suspense fallback={<p className='text-gray-400'>Loading...</p>}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    )
}

export default DashboardLayout
