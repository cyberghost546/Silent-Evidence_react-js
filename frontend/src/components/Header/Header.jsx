import { Link } from 'react-router-dom'
import { MessageCircleMore } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import UserMenu from '../UserMenu/UserMenu'
import NotificationMenu from '../NotificationMenu/NotificationMenu'
import CategoryDropdown from '../CategoryDropdown/CategoryDropdown'
import NavDropdown from '../NavDropdown/NavDropdown'


// ---------------------------------------------------------------
// Static menu contents. These live OUTSIDE the component because
// they never change - no reason to rebuild these arrays on every
// single render.
//
// (Categories is not here: those come from the database.)
// ---------------------------------------------------------------
const FORUM_ITEMS = [
    { label: 'General Discussion', href: '/forums/general' },
    { label: 'Cold Cases', href: '/forums/cold-cases' },
    { label: 'Theories', href: '/forums/theories' },
]

const EXPLORE_ITEMS = [
    { label: 'Latest', href: '/explore/latest' },
    { label: 'Most Viewed', href: '/explore/popular' },
    { label: 'Timeline', href: '/explore/timeline' },
]

// Shared styling for the plain nav links, kept in one constant so
// every link looks identical and you only edit it once.
const NAV_LINK = 'text-gray-200 hover:text-white transition-colors'

// Same for the round-ish icon buttons on the right (messages, bell).
const ICON_BUTTON = 'text-gray-300 hover:text-white transition-colors p-2'


function Header() {
    // Who's logged in now comes from AuthProvider (auth/AuthContext.jsx)
    // instead of a fake useState here - the Log In page needs to change
    // it too, and it isn't inside the Header.
    //   user    - null = logged out, an object = logged in
    //   loading - still asking Django "is anyone logged in?"
    //   logout  - passed down to UserMenu as its onLogout prop
    const { user, loading, logout } = useAuth()

    return (
        // justify-between splits the header into two groups:
        // [logo + nav] on the left, [search + auth] on the right.
        <header className='bg-slate-900 flex items-center justify-between px-8 py-3'>

            {/* ---------- LEFT: logo + navigation ---------- */}
            {/* These two are wrapped together so they stay side by
                side. Without this wrapper, justify-between would push
                the nav into the middle of the page. */}
            <div className='flex items-center gap-8'>

                <h1 className='text-2xl font-bold text-red-600 whitespace-nowrap'>
                    Silent Evidence
                </h1>

                <nav>
                    {/* text-sm font-medium = normal UI text size.
                        (The old text-2xl font-bold was heading size -
                        that's why it looked oversized.) */}
                    <ul className='flex items-center gap-6 text-sm font-medium'>
                        <li>
                            <a href='/' className={NAV_LINK}>Home</a>
                        </li>

                        {/* Contents come from /api/categories/ */}
                        <li>
                            <CategoryDropdown />
                        </li>

                        {/* Same component, different data. */}
                        <li>
                            <NavDropdown label='Forums' items={FORUM_ITEMS} />
                        </li>

                        {/* The "active page" pill. For now it's hardcoded.
                            Once react-router is installed, <NavLink> gives
                            you an isActive flag and you apply these classes
                            conditionally instead. */}
                        <li>
                            <a
                                href='/videos'
                                className='bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition-colors'
                            >
                                Videos
                            </a>
                        </li>

                        <li>
                            <NavDropdown label='Explore' items={EXPLORE_ITEMS} />
                        </li>

                        <li>
                            <a href='/about' className={NAV_LINK}>About</a>
                        </li>

                        <li>
                            <a href='/contact' className={NAV_LINK}>Contact</a>
                        </li>
                    </ul>
                </nav>
            </div>

            {/* ---------- RIGHT: search + auth ---------- */}
            <div className='flex items-center gap-3'>

                {/* An icon-only button has no text, so a screen reader
                    would announce nothing. aria-label supplies the name. */}
                <button
                    type='button'
                    aria-label='Search'
                    className='text-gray-300 hover:text-white transition-colors p-2'
                >
                    <svg
                        className='w-5 h-5'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        viewBox='0 0 24 24'
                        aria-hidden='true'
                    >
                        <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z' />
                    </svg>
                </button>

                {/* One ternary swaps the whole auth area:
                    logged out -> Log In + Sign Up
                    logged in  -> the avatar dropdown
                    `!loading &&` hides both while we're still asking
                    Django - otherwise a logged-in user would see the
                    Log In button flash on every page load. */}
                {!loading && (user ? (
                    // Logged in: messages, notifications, then the avatar
                    // menu. The icon links go to pages that don't exist
                    // yet (they show "Page not found" for now).
                    // aria-label gives an icon-only link a name for
                    // screen readers, like the search button above.
                    <>
                        <Link to='/messages' aria-label='Messages' className={ICON_BUTTON}>
                            <MessageCircleMore className='w-5 h-5' />
                        </Link>
                        {/* The bell + dropdown lives in its own component. */}
                        <NotificationMenu />
                        <UserMenu user={user} onLogout={logout} />
                    </>
                ) : (
                    // <>...</> is a "fragment": it groups both buttons
                    // without adding an extra <div> to the page.
                    <>
                        {/* OUTLINED button: transparent inside, red border.
                            Both are <a> now, because both go to a page. */}
                        <a
                            href='/login'
                            className='border border-red-600 text-red-500 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-600 hover:text-white transition-colors'
                        >
                            Log In
                        </a>

                        {/* SOLID button: filled red. */}
                        <a
                            href='/signup'
                            className='bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-700 transition-colors'
                        >
                            Sign Up
                        </a>
                    </>
                ))}
            </div>
        </header>
    )
}


export default Header
