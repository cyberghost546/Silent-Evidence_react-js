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
//
// So the sidebar is written once, and every new dashboard page
// gets it for free.
// ---------------------------------------------------------------
function DashboardLayout() {
    return (
        <div className='flex min-h-screen bg-gray-950 text-white'>
            <Sidebar />

            {/* flex-1 = take all the width the sidebar doesn't use.
                min-w-0 stops wide content (like a long table) from
                stretching the page sideways. */}
            <main className='min-w-0 flex-1 p-8'>
                <Outlet />
            </main>
        </div>
    )
}

export default DashboardLayout
