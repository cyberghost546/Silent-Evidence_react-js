import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircleMore, Menu, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getUnreadCount } from '../../api/client'
import UserMenu from '../UserMenu/UserMenu'
import NotificationMenu from '../NotificationMenu/NotificationMenu'
import CategoryDropdown from '../CategoryDropdown/CategoryDropdown'
import NavDropdown from '../NavDropdown/NavDropdown'
import SearchModal from '../SearchModal/SearchModal'
import SiteTour, { TOUR_SEEN_KEY } from '../SiteTour/SiteTour'
import AskTheWatcher from '../SiteGuide/AskTheWatcher'
import { OPEN_WATCHER_EVENT } from '../SiteGuide/openWatcher'


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
    { label: 'All boards', href: '/forums' },
]

const EXPLORE_ITEMS = [
    { label: 'Latest', href: '/explore/latest' },
    { label: 'Most Viewed', href: '/explore/popular' },
    { label: 'Timeline', href: '/explore/timeline' },
    { label: 'Writing Challenges', href: '/challenges' },
    { label: 'Story Chains', href: '/chains' },
    { label: 'Bundles', href: '/bundles' },
    { label: 'True Stories', href: '/true-stories' },
    { label: 'Haunted Map', href: '/map' },
    { label: 'Read-alongs', href: '/read-alongs' },
]

// Shared styling for the plain nav links, kept in one constant so
// every link looks identical and you only edit it once.
const NAV_LINK = 'text-gray-200 hover:text-white transition-colors'

// Same for the round-ish icon buttons on the right (messages, bell).
// p-1.5 on phones, p-2 from "sm" up: 4px less per icon adds up when
// five of them share a 360px screen with the logo.
const ICON_BUTTON = 'text-gray-300 hover:text-white transition-colors p-1.5 sm:p-2'

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

    // Is the pop-up search open? (components/SearchModal)
    const [searchOpen, setSearchOpen] = useState(false)

    // Is the Site Guide tour open? (components/SiteTour)
    //
    // The function form of useState runs only ONCE, on the first
    // render: "has this visitor seen the tour before?" If not, it
    // starts open - so first-time visitors get the tour by itself.
    // SiteTour saves 'seen' when it's closed, so it won't come back.
    const [tourOpen, setTourOpen] = useState(() => {
        try {
            return localStorage.getItem(TOUR_SEEN_KEY) === null
        } catch {
            // localStorage blocked (private browsing): don't pester them.
            return false
        }
    })

    // useCallback = "keep the SAME function between renders".
    // SearchModal's useEffect lists onClose in its [ ], so a brand-new
    // function on every render would make that effect stop and start
    // again each time. With useCallback it only runs once per opening.
    const closeSearch = useCallback(() => setSearchOpen(false), [])

    // Is the Ask The Watcher pop-up open? (components/SiteGuide)
    // It sits in the same corner as the tour, so only one of the two
    // is ever open: opening one closes the other.
    const [watcherOpen, setWatcherOpen] = useState(false)
    // useCallback for the same reason as closeSearch: AskTheWatcher's
    // Esc-key effect lists onClose in its [ ].
    const closeWatcher = useCallback(() => setWatcherOpen(false), [])

    function openTour() {
        setWatcherOpen(false)
        setTourOpen(true)
    }

    // Buttons all over the site call openWatcher() (openWatcher.js),
    // which sends this event. We're the ones who show the pop-up.
    useEffect(() => {
        function handleOpen() {
            setTourOpen(false)
            setMenuOpen(false)
            setWatcherOpen(true)
        }
        window.addEventListener(OPEN_WATCHER_EVENT, handleOpen)
        return () => window.removeEventListener(OPEN_WATCHER_EVENT, handleOpen)
    }, [])

    // Keyboard shortcut: Ctrl + K (Cmd + K on a Mac) opens the search
    // from anywhere - the same shortcut many sites use.
    useEffect(() => {
        function handleKey(event) {
            // metaKey = the Cmd key on a Mac.
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                // Stop the browser's own Ctrl+K (it jumps to the
                // address bar in some browsers).
                event.preventDefault()
                setSearchOpen(true)
            }
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [])

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

                {/* The logo takes you home.
                    On phones it's smaller (text-base), so it fits next to
                    the 5 icons of a logged-in member. And if a phone is
                    REALLY narrow, `truncate` cuts it with "..." instead of
                    sliding under the icons. (truncate needs a block, and
                    min-w-0 on the parent - see the div above.) */}
                <Link to='/' className='block truncate text-base font-bold text-red-600 sm:text-2xl'>
                    Silent Evidence
                </Link>

                {/* hidden lg:block = only on big screens. Smaller
                    screens get the ☰ menu button instead. */}
                <nav className='hidden lg:block'>
                    {/* text-sm font-medium = normal UI text size.
                        (The old text-2xl font-bold was heading size -
                        that's why it looked oversized.) */}
                    <ul className='flex items-center gap-6 text-sm font-bold'>
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
                    would announce nothing. aria-label supplies the name.
                    It's a BUTTON now (not a link): it opens the pop-up
                    search instead of going to another page.
                    While the pop-up is open it turns into a red square.
                    title = the tooltip on hover, showing the shortcut. */}
                <button
                    type='button'
                    onClick={() => setSearchOpen(true)}
                    aria-label='Search'
                    title='Search (Ctrl + K)'
                    className={`rounded-lg p-1.5 transition-colors sm:p-2 ${
                        searchOpen ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white'
                    }`}
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
                        <MessagesLink />
                        {/* The bell + dropdown lives in its own component. */}
                        <NotificationMenu />
                        <UserMenu user={user} onLogout={logout} onOpenTour={openTour} />
                    </>
                ) : (
                    // <>...</> is a "fragment": it groups both buttons
                    // without adding an extra <div> to the page.
                    <>
                        {/* OUTLINED button: transparent inside, red border.
                            rounded-full = pill shape (fully round ends).
                            Both are <a> now, because both go to a page. */}
                        <a
                            href='/login'
                            className='whitespace-nowrap border border-red-600 text-red-500 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-red-600 hover:text-white transition-colors'
                        >
                            Log In
                        </a>

                        {/* SOLID button: filled red. */}
                        <a
                            href='/signup'
                            className='hidden whitespace-nowrap sm:inline-block bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-red-700 transition-colors'
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
                        {/* Site Guide opens the tour, so it's a button,
                            not one of the links below. */}
                        <li>
                            <button
                                type='button'
                                onClick={() => {
                                    setMenuOpen(false)
                                    openTour()
                                }}
                                className='block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-slate-800 hover:text-white'
                            >
                                Site Guide
                            </button>
                        </li>
                        {/* Ask The Watcher opens its pop-up - a button too. */}
                        <li>
                            <button
                                type='button'
                                onClick={() => {
                                    setMenuOpen(false)
                                    setWatcherOpen(true)
                                    setTourOpen(false)
                                }}
                                className='block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-slate-800 hover:text-white'
                            >
                                Ask The Watcher
                            </button>
                        </li>
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
            {/* ---------- THE POP-UP SEARCH ---------- */}
            {/* Only on the page while it's open. It covers the whole
                window (position: fixed), so where it sits in the JSX
                doesn't matter. */}
            {searchOpen && <SearchModal onClose={closeSearch} />}

            {/* ---------- THE SITE GUIDE TOUR ---------- */}
            {/* Opened from the user menu, the phone menu, or by itself
                on a visitor's first visit (see tourOpen above). */}
            {tourOpen && <SiteTour onClose={() => setTourOpen(false)} />}

            {/* ---------- ASK THE WATCHER ---------- */}
            {/* Same corner, same size as the tour. Opened from anywhere
                with openWatcher() - see the useEffect above. */}
            {watcherOpen && <AskTheWatcher onClose={closeWatcher} />}
        </header>
    )
}


export default Header
