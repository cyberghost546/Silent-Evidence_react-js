import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// The dark page background - see the comments in the CSS file.
import styles from './AuthLayout.module.css'


// ---------------------------------------------------------------
// THE FRAME AROUND THE LOG IN AND SIGN UP PAGES.
//
// A full-screen dark page with a "Back to site" link. Whatever you
// put inside goes in the middle:
//
//   <AuthLayout>
//       <form className={authStyles.card}>...</form>
//   </AuthLayout>
//
// Both pages use it, so the frame is written ONCE. A "Forgot
// password" or "Reset password" page later on can use it too.
//
// These pages sit OUTSIDE SiteLayout in App.jsx, so there's no site
// header or footer - the card gets the whole screen.
// ---------------------------------------------------------------
function AuthLayout({ children }) {
    return (
        // relative = the anchor for the "Back to site" link, which is
        // absolute. min-h-screen = at least as tall as the window.
        <div className={`${styles.page} relative flex min-h-screen flex-col items-center justify-center px-4 py-20`}>

            {/* ---------- BACK TO SITE ---------- */}
            {/* absolute = pinned to the top-left corner of the page. */}
            <Link to='/' className='absolute left-6 top-6 flex items-center gap-2 text-gray-400 transition-colors hover:text-white'>
                <ArrowLeft className='h-5 w-5' />
                Back to site
            </Link>

            {/* ---------- THE PAGE'S OWN CONTENT ---------- */}
            {/* w-full + flex-col + items-center keep it centred. */}
            <div className='flex w-full flex-col items-center'>
                {children}
            </div>
        </div>
    )
}

export default AuthLayout
