import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircleMore, Menu, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getUnreadCount } from '../../api/client'
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

// The links in the phone menu (the ☰ button). On a small screen the
// normal nav doesn't fit, so these show in a panel instead.
// The dropdowns (Categories, Forums, Explore) become plain links here.
const MOBILE_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'Search', href: '/search' },
    { label: 'Videos', href: '/videos' },
    ...EXPLORE_ITEMS,
    ...FORUM_ITEMS,
    { label: 'Leaderboard', href: '/leaderboard' },
    { label: 'Site Guide', href: '/guide' },
    { label: 'Ask The Watcher', href: '/watcher' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
]
// (...EXPLORE_ITEMS = "put every item of that list in here". The
// arrays above are defined first, so they exist by now.)


// ---------------------------------------------------------------
// The Messages icon, with a red number when you have unread ones.
//
// It asks Django "how many unread?" when it appears, when you go to
// another page, and every 30 seconds (the same "polling" idea as
// the Messages page).
// ---------------------------------------------------------------
function MessagesLink() {
    const [unread, setUnread] = useState(0)

    // location changes on every page change -> check again then too,
    // so the number goes away right after you read your messages.
    const location = useLocation()

    useEffect(() => {
        function check() {
            getUnreadCount()
                .then(data => setUnread(data.unread))
                .catch(() => {})   // not important enough to show an error
        }

        check()
        const timer = setInterval(check, 30000)
        return () => clearInterval(timer)
    }, [location.pathname])

    return (
        // relative = the anchor for the little red number.
        <Link to='/messages' aria-label={`Messages${unread > 0 ? `, ${unread} unread` : ''}`} className={`relative ${ICON_BUTTON}`}>
            <MessageCircleMore className='w-5 h-5' />
            {unread > 0 && (
                <span className='absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white'>
                    {/* 100 unread -> "9+", so the badge stays small. */}
                    {unread > 9 ? '9+' : unread}
                </span>
            )}
        </Link>
    )
}


function Header() {
    // Who's logged in now comes from AuthProvider (auth/AuthContext.jsx)
    // instead of a fake useState here - the Log In page needs to change
    // it too, and it isn't inside the Header.
    //   user    - null = logged out, an object = logged in
    //   loading - still asking Django "is anyone logged in?"
    //   logout  - passed down to UserMenu as its onLogout prop
    const { user, loading, logout } = useAuth()

    // Is the phone menu open?
    const [menuOpen, setMenuOpen] = useState(false)

    return (
        // justify-between splits the header into two groups:
        // [logo + nav] on the left, [search + auth] on the right.
        // relative = the anchor for the phone menu panel below.
        // px-4 on phones, px-8 from the "sm" size up.
        <header className='relative bg-slate-900 flex items-center justify-between px-4 py-3 sm:px-8'>

            {/* ---------- LEFT: logo + navigation ---------- */}
            {/* These two are wrapped together so they stay side by
                side. Without this wrapper, justify-between would push
                the nav into the middle of the page. */}
            <div className='flex items-center gap-8 min-w-0'>

                {/* The logo takes you home. text-xl on phones, so it
                    fits next to the buttons. */}
                <Link to='/' className='text-lg font-bold text-red-600 whitespace-nowrap sm:text-2xl'>
                    Silent Evidence
                </Link>

                {/* hidden lg:block = only on big screens. Smaller
                    screens get the ☰ menu button instead. */}
                <nav className='hidden lg:block'>
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
            {/* gap-0 on phones (every pixel counts), gap-3 from "sm" up. */}
            <div className='flex shrink-0 items-center gap-0 sm:gap-3'>

                {/* An icon-only button has no text, so a screen reader
                    would announce nothing. aria-label supplies the name. */}
                <Link
                    to='/search'
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
                </Link>

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
                        <MessagesLink />
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
                            className='whitespace-nowrap border border-red-600 text-red-500 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-600 hover:text-white transition-colors'
                        >
                            Log In
                        </a>

                        {/* SOLID button: filled red. */}
                        <a
                            href='/signup'
                            className='hidden whitespace-nowrap sm:inline-block bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-700 transition-colors'
                        >
                            Sign Up
                        </a>
                    </>
                ))}

                {/* ☰ / X - opens and closes the phone menu.
                    lg:hidden = gone on big screens, where the nav fits. */}
                <button
                    type='button'
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                    className={`lg:hidden ${ICON_BUTTON}`}
                >
                    {menuOpen ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
                </button>
            </div>

            {/* ---------- THE PHONE MENU ---------- */}
            {/* absolute + top-full = hangs right under the header,
                on top of the page (z-40). */}
            {menuOpen && (
                <nav className='absolute left-0 right-0 top-full z-40 border-t border-slate-800 bg-slate-900 px-4 py-3 shadow-2xl lg:hidden'>
                    <ul className='grid grid-cols-2 gap-1'>
                        {MOBILE_LINKS.map(link => (
                            <li key={link.href}>
                                {/* onClick closes the menu when you pick a page. */}
                                <Link
                                    to={link.href}
                                    onClick={() => setMenuOpen(false)}
                                    className='block rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-slate-800 hover:text-white'
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </header>
    )
}


export default Header
