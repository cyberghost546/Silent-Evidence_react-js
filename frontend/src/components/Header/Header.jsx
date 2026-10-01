import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MessageCircleMore, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getUnreadCount } from '../../api/client'
import UserMenu from '../UserMenu/UserMenu'
import NotificationMenu from '../NotificationMenu/NotificationMenu'
import BottomNav from '../BottomNav/BottomNav'
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

// Shared styling for the plain nav links (they turn red on hover),
// kept in one constant so every link looks identical and you only
// edit it once. The dropdowns (Categories...) use the same colours
// in NavDropdown.jsx.
const NAV_LINK = 'text-gray-200 hover:text-red-500 transition-colors'

// The small icon buttons on the right (search, messages, bell) all
// sit together inside ONE rounded "pill", like a phone app:
//
//     ( 🔍  💬  🔔 )  (avatar)        <- phones: just ( 🔔 ), the
//                                        others are in the tab bar
//
// Each button is a 32px circle (36px from "sm" up) with no
// background of its own - the pill behind them is the background.
// The bell (NotificationMenu.jsx) uses the same classes.
const ICON_BUTTON = 'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white sm:h-9 sm:w-9'

// The pill itself: a faint background + a faint outline (ring).
// (No "flex" in here: the pill is hidden on some screens, so where
// it's used we add either flex or hidden lg:flex.)
const ICON_PILL = 'items-center gap-0.5 rounded-full bg-white/5 p-1 ring-1 ring-white/10'


// ---------------------------------------------------------------
// THE PAGE TITLE (phones and tablets only)
//
// Apps show the name of the screen you're on at the top - "Explore",
// "Settings"... - instead of the logo on every screen. This list says
// which name goes with which address. The first one that matches wins,
// so the longer, more exact addresses come first.
// ---------------------------------------------------------------
const PAGE_TITLES = [
    ['/explore/latest', 'Latest'],
    ['/explore/popular', 'Most Viewed'],
    ['/explore/timeline', 'Timeline'],
    ['/explore', 'Explore'],
    ['/forums', 'Forums'],
    ['/videos', 'Videos'],
    ['/profile', 'Profile'],
    ['/messages', 'Messages'],
    ['/notifications', 'Notifications'],
    ['/settings', 'Settings'],
    ['/write', 'Write a Story'],
    ['/search', 'Search'],
    ['/stories', 'Story'],
    ['/category', 'Category'],
    ['/challenges', 'Challenges'],
    ['/chains', 'Story Chains'],
    ['/bundles', 'Bundles'],
    ['/true-stories', 'True Stories'],
    ['/map', 'Haunted Map'],
    ['/read-alongs', 'Read-alongs'],
    ['/leaderboard', 'Leaderboard'],
    ['/lists', 'My Lists'],
    ['/history', 'Reading History'],
    ['/my-stories', 'My Stories'],
    ['/premium', 'Premium'],
    ['/guide', 'Site Guide'],
    ['/about', 'About'],
    ['/contact', 'Contact'],
]

// The name for an address, or null = "show the logo instead"
// (the home page, and any page that isn't in the list).
function getPageTitle(pathname) {
    // Array destructuring: each item is [address, name].
    for (const [path, title] of PAGE_TITLES) {
        // '/explore' should match '/explore' and '/explore/latest',
        // but NOT '/explorers' - hence the + '/'.
        if (pathname === path || pathname.startsWith(path + '/')) {
            return title
        }
    }
    return null
}

// The "main" screens - the ones in the bottom tab bar. They don't
// get a back arrow (you get to them from the tabs). Every other page
// is a page you went INTO, so it gets ← to go back, like in an app.
function isMainScreen(pathname) {
    return ['/', '/forums', '/videos', '/profile'].includes(pathname)
        || pathname.startsWith('/explore')
}

// The phone menu (the ☰ button). On a small screen the normal nav
// doesn't fit, so these show in a panel instead.
//
// They're split into SECTIONS, each with a small heading, so the
// menu reads like the desktop nav (Explore, Forums...) instead of
// one long jumble of 20 links.
//
// Two items don't go to a page - they open a pop-up. Those get
// `action` instead of `href`, and the menu turns them into buttons.
const MOBILE_SECTIONS = [
    {
        title: 'Main',
        links: [
            { label: 'Home', href: '/' },
            { label: 'Videos', href: '/videos' },
            { label: 'Search', href: '/search' },
            { label: 'Leaderboard', href: '/leaderboard' },
        ],
    },
    // The same arrays the desktop dropdowns use, so the two menus
    // can never get out of sync.
    { title: 'Explore', links: EXPLORE_ITEMS },
    { title: 'Forums', links: FORUM_ITEMS },
    {
        title: 'Help',
        links: [
            { label: 'Site Guide', action: 'tour' },
            { label: 'Ask The Watcher', action: 'watcher' },
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
        ],
    },
]

// Shared look for every item in the phone menu.
// py-2.5 = a comfortable thumb-sized tap target.
const MOBILE_ITEM = 'block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors'


// ---------------------------------------------------------------
// HOW MANY UNREAD MESSAGES? (a small custom hook)
//
// It asks Django "how many unread?" when the page loads, when you go
// to another page, and every 30 seconds (the same "polling" idea as
// the Messages page).
//
// Why a hook and not inside MessagesLink? Because TWO places show
// the number now: the header's icon (big screens) and the Messages
// tab in the phone tab bar. Asking once here and handing the number
// to both means one request, not two.
//
// `enabled` = only ask when someone is logged in.
// ---------------------------------------------------------------
function useUnreadMessages(enabled) {
    const [unread, setUnread] = useState(0)

    // location changes on every page change -> check again then too,
    // so the number goes away right after you read your messages.
    const location = useLocation()

    useEffect(() => {
        if (!enabled) return

        function check() {
            getUnreadCount()
                .then(data => setUnread(data.unread))
                .catch(() => {})   // not important enough to show an error
        }

        check()
        const timer = setInterval(check, 30000)
        return () => clearInterval(timer)
    }, [enabled, location.pathname])

    // Logged out -> always 0, even if an old number is still stored.
    return enabled ? unread : 0
}


// The Messages icon (big screens), with a red number when you have
// unread ones. The number comes from useUnreadMessages above.
function MessagesLink({ unread }) {
    return (
        // relative = the anchor for the little red number.
        <Link to='/messages' aria-label={`Messages${unread > 0 ? `, ${unread} unread` : ''}`} className={ICON_BUTTON}>
            <MessageCircleMore className='w-5 h-5' />
            {unread > 0 && (
                // ring-2 ring-slate-900 = a thin outline the colour of
                // the header, so the badge looks "cut out" of the circle.
                <span className='absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-slate-900'>
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

    // Unread messages - shown on the header icon AND the phone tab bar.
    const unreadMessages = useUnreadMessages(Boolean(user))

    // Which page we're on - for the phone title, the back arrow, and
    // highlighting the current page's link in the phone menu.
    const location = useLocation()
    const pageTitle = getPageTitle(location.pathname)
    const showBack = !isMainScreen(location.pathname)

    // Close the phone menu whenever the page changes - from a tab,
    // the + button, the browser's Back button, anything. Otherwise the
    // menu would stay open on top of the new page.
    //
    // This is React's "adjust state when a value changes" pattern:
    // remember the last address, and when it's different, update.
    // (A useEffect would also work, but it draws the page once with
    // the menu still open, and then again closed.)
    const [lastPath, setLastPath] = useState(location.pathname)
    if (lastPath !== location.pathname) {
        setLastPath(location.pathname)
        setMenuOpen(false)
    }

    // ← goes back one page, like the browser's Back button.
    // But if this is the FIRST page of the visit (someone opened a
    // shared link), there's nothing to go back to - so go home.
    // React Router keeps a counter (idx) in history.state: 0 = first.
    const navigate = useNavigate()
    function goBack() {
        if (window.history.state?.idx > 0) {
            navigate(-1)
        } else {
            navigate('/')
        }
    }

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
        //
        // sticky top-0 (phones and tablets only): the header stays
        // at the top while you scroll, like an app's top bar.
        // On big screens lg:relative puts it back to normal.
        <header className='sticky top-0 z-50 bg-slate-900 flex items-center justify-between px-4 py-3 sm:px-8 lg:relative lg:z-auto'>

            {/* ---------- LEFT: logo + navigation ---------- */}
            {/* These two are wrapped together so they stay side by
                side. Without this wrapper, justify-between would push
                the nav into the middle of the page. */}
            <div className='flex items-center gap-8 min-w-0'>

                {/* ----- PHONES AND TABLETS: [←] Page name ----- */}
                {/* lg:hidden = this whole bit is gone on big screens. */}
                <div className='flex min-w-0 items-center gap-1 lg:hidden'>
                    {showBack && (
                        // -ml-2 lines the arrow's ICON up with the page
                        // edge (the button has some padding around it).
                        <button
                            type='button'
                            onClick={goBack}
                            aria-label='Go back'
                            className='-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-200 transition-colors hover:bg-white/10'
                        >
                            <ArrowLeft className='h-5 w-5' />
                        </button>
                    )}

                    {/* The page's name, or the red logo on the home page.
                        truncate = a long name ends in "..." instead of
                        sliding under the icons. (truncate needs a block,
                        and min-w-0 on the parents.) */}
                    {pageTitle ? (
                        <span className='block truncate text-xl font-bold text-white'>{pageTitle}</span>
                    ) : (
                        <Link to='/' className='block truncate text-xl font-bold text-red-600'>
                            Silent Evidence
                        </Link>
                    )}
                </div>

                {/* ----- BIG SCREENS: the logo, always ----- */}
                <Link to='/' className='hidden truncate text-2xl font-bold text-red-600 lg:block'>
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

            {/* ---------- RIGHT: the icon pill + auth ---------- */}
            <div className='flex shrink-0 items-center gap-2 sm:gap-3'>

                {/* The pill.
                      big screens: search, messages, bell
                      phones:      only the bell (search and messages are
                                   in the tab bar at the bottom instead)
                    Logged out on a phone there's nothing left to put in
                    it, so the whole pill is hidden (hidden lg:flex). */}
                <div className={`${ICON_PILL} ${user ? 'flex' : 'hidden lg:flex'}`}>

                {/* "hidden lg:contents" = invisible on phones; on big
                    screens the wrapper acts as if it isn't there
                    (contents), so its two buttons sit straight in the
                    pill like the bell does. */}
                <div className='hidden lg:contents'>

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
                    // The ! at the end of a class = "important": it wins
                    // over the text-gray-300 already in ICON_BUTTON, so
                    // the open search turns red with a white icon.
                    className={`${ICON_BUTTON} ${searchOpen ? 'bg-red-600 text-white!' : ''}`}
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

                    {/* Messages: logged-in members only.
                        `!loading &&` waits until Django has told us who
                        is logged in, so nothing flashes on page load. */}
                    {!loading && user && <MessagesLink unread={unreadMessages} />}
                </div>

                    {/* The bell + dropdown lives in its own component.
                        On phones too - it's the one icon that stays up here. */}
                    {!loading && user && <NotificationMenu />}
                </div>

                {/* One ternary swaps the whole auth area:
                    logged out -> Log In + Sign Up
                    logged in  -> the avatar dropdown */}
                {!loading && (user ? (
                    <UserMenu user={user} onLogout={logout} onOpenTour={openTour} />
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
            </div>

            {/* ---------- THE PHONE TAB BAR ---------- */}
            {/* It lives HERE (not in SiteLayout) because its Search and
                Menu buttons open things this component controls - the
                pop-up search and the menu below. Passing the state and
                the "open" functions down as props is how a child
                component changes its parent's state. */}
            <BottomNav
                unreadMessages={unreadMessages}
                searchOpen={searchOpen}
                onSearch={() => {
                    setMenuOpen(false)
                    setSearchOpen(true)
                }}
                menuOpen={menuOpen}
                onMenu={() => setMenuOpen(!menuOpen)}
            />

            {/* ---------- THE PHONE MENU ---------- */}
            {/* Opened by the Menu tab, so it pops up from the BOTTOM,
                just above the tab bar - a "sheet", like in phone apps.
                fixed + bottom-[...] = sits above the tab bar (whose
                height is --tabbar-space, see index.css). */}
            {menuOpen && (
                // max-h + overflow-y-auto: on a short phone screen the
                // menu scrolls inside itself instead of running off the
                // top. overscroll-contain stops the page behind from
                // scrolling when you reach the end of the menu.
                // scrollbar-none (index.css) = swipe to scroll, but no
                // scrollbar drawn - like a phone app, and it keeps the
                // rounded corners clean.
                <nav className='scrollbar-none fixed inset-x-3 bottom-[calc(var(--tabbar-space)+0.5rem)] z-40 mx-auto max-h-[70dvh] max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-slate-950/95 px-3 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl lg:hidden'>
                    {/* divide-y = a thin line between each section. */}
                    <div className='divide-y divide-slate-800'>
                        {MOBILE_SECTIONS.map(section => (
                            <div key={section.title} className='py-3'>
                                {/* Small grey heading, like the footer's. */}
                                <h3 className='px-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-500'>
                                    {section.title}
                                </h3>

                                <ul className='grid grid-cols-2 gap-1'>
                                    {section.links.map(link => (
                                        <li key={link.label}>
                                            {link.action ? (
                                                // Opens a pop-up, so it's a button.
                                                <button
                                                    type='button'
                                                    onClick={() => {
                                                        setMenuOpen(false)
                                                        if (link.action === 'tour') {
                                                            openTour()
                                                        } else {
                                                            setTourOpen(false)
                                                            setWatcherOpen(true)
                                                        }
                                                    }}
                                                    className={`${MOBILE_ITEM} text-gray-200 hover:bg-slate-800 hover:text-white`}
                                                >
                                                    {link.label}
                                                </button>
                                            ) : (
                                                // A normal page. The page you're on now
                                                // is highlighted red, so you can see
                                                // where you are. onClick closes the menu.
                                                <Link
                                                    to={link.href}
                                                    onClick={() => setMenuOpen(false)}
                                                    className={`${MOBILE_ITEM} ${
                                                        location.pathname === link.href
                                                            ? 'bg-red-600/15 font-semibold text-red-500'
                                                            : 'text-gray-200 hover:bg-slate-800 hover:text-white'
                                                    }`}
                                                >
                                                    {link.label}
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
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
