import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'
import AnnouncementBanner from '../AnnouncementBanner/AnnouncementBanner'
import CookieBanner from '../CookieBanner/CookieBanner'
import WarningNotice from '../WarningNotice/WarningNotice'
import Footer from '../Footer/Footer'
import BackToTop from '../BackToTop/BackToTop'


// ---------------------------------------------------------------
// The frame around every PUBLIC page: header on top, footer at the
// bottom, the page itself in between (<Outlet />).
//
// The dashboard has its own frame (DashboardLayout) with a sidebar
// instead - see App.jsx for which pages use which.
// ---------------------------------------------------------------
function SiteLayout() {
    return (
        // min-h-screen + flex-col + flex-1 on the middle section is the
        // standard "sticky footer" trick: if the page content is short,
        // the footer still sits at the bottom of the window instead of
        // floating halfway up the screen.
        <div className='home min-h-screen flex flex-col'>
            {/* The admins' announcement (if one is switched on). */}
            <AnnouncementBanner />
            <Header />

            <main className='flex-1'>
                {/* Some pages are loaded lazily (see App.jsx): Suspense
                    shows the fallback while their file downloads. */}
                <Suspense fallback={<p className='px-6 py-16 text-center text-gray-400'>Loading...</p>}>
                    <Outlet />
                </Suspense>
            </main>

            <Footer />

            {/* Pop-ups that can appear on any public page:
                the cookie choice (first visit) and a moderator's
                warning (until the member confirms it). */}
            <CookieBanner />
            <WarningNotice />

            {/* The round "back to top" button - on every public page. */}
            <BackToTop />
        </div>
    )
}

export default SiteLayout
