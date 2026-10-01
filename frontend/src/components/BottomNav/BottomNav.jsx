import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, Plus, MessageCircleMore, Menu, X } from 'lucide-react'


// ===============================================================
// THE PHONE TAB BAR
//
// The row of icons at the bottom of the screen on a phone, like
// Instagram, Reddit or YouTube. This is the single biggest thing
// that makes a website feel like an APP: everything is one
// thumb-tap away.
//
//      ⌂        🔍        (+)        💬        ☰
//    Home     Search             Messages    Menu
//
// The look:
//   - a "frosted glass" card floating just above the bottom edge
//   - the active tab gets a soft red bubble behind its icon
//     (the same idea as Android's own apps)
//   - Write is a raised, glowing red button in the middle
//
// Two kinds of tab:
//   - Home and Messages go to a PAGE      -> a <NavLink>
//   - Search and Menu OPEN something      -> a <button>
//     (the pop-up search, the menu sheet). Those live in Header.jsx,
//     so the Header passes us "is it open?" and "open it" as props.
//
// lg:hidden = only on phones and tablets. On a big screen the
// normal header nav is there instead.
// ===============================================================


// The small name under every icon.
const LABEL = 'text-[11px] leading-none'


// ---------------------------------------------------------------
// What a tab LOOKS like: the bubble with the icon, the red number
// (if any), and the name. Both kinds of tab use this, so they can
// never look different.
// ---------------------------------------------------------------
function TabFace({ icon: Icon, label, active, badge = 0 }) {
    // ({ icon: Icon }) = take the "icon" prop but call it Icon - a
    // component's name has to start with a capital letter in JSX.
    return (
        <>
            {/* The bubble. It's always there (h-8 w-14), but only
                coloured in when active - so the icons don't jump around
                when you switch tabs. relative = anchor for the badge. */}
            <span
                className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-red-600/20 text-red-400' : 'text-gray-400'
                }`}
            >
                {/* Thicker lines on the active icon = "bold". */}
                <Icon className='h-5.5 w-5.5' strokeWidth={active ? 2.25 : 1.75} />

                {/* The red number, e.g. unread messages. 9+ keeps it small.
                    ring-2 = an outline the colour of the bar, so it looks
                    "cut out" of the icon. */}
                {badge > 0 && (
                    <span className='absolute right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-slate-950'>
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </span>

            <span className={`${LABEL} ${active ? 'font-semibold text-white' : 'font-medium text-gray-500'}`}>
                {label}
            </span>
        </>
    )
}

// Shared by both kinds of tab: flex-1 = all tabs share the width.
const TAB = 'flex flex-1 flex-col items-center justify-center gap-1'


// A tab that goes to a page.
// `dimmed` lets the parent say "don't light this tab up right now",
// e.g. Home while the menu is open on top of it.
function LinkTab({ to, end, icon, label, badge, dimmed }) {
    return (
        <NavLink to={to} end={end} className={TAB}>
            {/* The children of a NavLink can be a function: it hands
                us isActive (= "is this page the one being shown?"). */}
            {({ isActive }) => (
                <TabFace icon={icon} label={label} badge={badge} active={isActive && !dimmed} />
            )}
        </NavLink>
    )
}


// A tab that opens something instead of going to a page.
function ButtonTab({ onClick, icon, label, active }) {
    return (
        // aria-expanded tells screen readers whether the thing it
        // opens is open right now.
        <button type='button' onClick={onClick} aria-expanded={active} className={TAB}>
            <TabFace icon={icon} label={label} active={active} />
        </button>
    )
}


// The red Write button in the middle - the main action of the site,
// so it's bigger, raised and glowing.
function WriteButton() {
    return (
        // No label under this one - the + says it, and a word would
        // be squashed under the raised button. The aria-label gives
        // screen readers the name instead.
        <NavLink to='/write' aria-label='Write a story' className='flex flex-1 items-start justify-center'>
            {/* -mt-5 pulls the button up so it pokes out of the bar.
                bg-linear-to-br = a gradient, lighter red top-left to
                darker red bottom-right, so it looks a bit 3D.
                ring-4 ring-slate-950 = a dark outline the colour of
                the page, which "cuts" it out of the bar.
                The red shadow is the glow.
                active:scale-95 = it shrinks a tiny bit while your
                finger is on it, like a real app button. */}
            <span className='-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-red-500 to-red-700 text-white shadow-[0_6px_20px_rgba(220,38,38,0.55)] ring-4 ring-slate-950 transition active:scale-95'>
                <Plus className='h-7 w-7' strokeWidth={2.5} />
            </span>
        </NavLink>
    )
}


// ---------------------------------------------------------------
// THE BAR. The props all come from Header.jsx:
//   unreadMessages  the red number on Messages
//   searchOpen      is the pop-up search showing?
//   onSearch        open it
//   menuOpen        is the menu sheet showing?
//   onMenu          open / close it
// ---------------------------------------------------------------
function BottomNav({ unreadMessages, searchOpen, onSearch, menuOpen, onMenu }) {
    // While the search or the menu is open, THAT is the active tab -
    // so the page tabs (Home, Messages) shouldn't light up as well.
    const somethingOpen = searchOpen || menuOpen

    // Messages has more than one address (/messages/raven...), and
    // they should all light up the Messages tab. NavLink does that by
    // itself (without "end"), so this is only used for the badge.
    const { pathname } = useLocation()
    const onMessages = pathname.startsWith('/messages')

    return (
        // fixed = stays put on the SCREEN while the page scrolls.
        //
        // inset-x-3 + bottom-[...] = a card with a 12px gap around it.
        // env(safe-area-inset-bottom) is the height of the iPhone's
        // swipe bar, so the card sits ABOVE it. (Needs viewport-fit=
        // cover in index.html.)
        //
        // Frosted glass = a see-through background (bg-slate-950/80)
        // + backdrop-blur-xl, which blurs whatever scrolls behind it.
        // border-white/10 = a very faint light edge, which makes the
        // card stand out from the dark page.
        <nav
            aria-label='Main'
            className='fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-[28px] border border-white/10 bg-slate-950/80 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl lg:hidden'
        >
            {/* h-16 = 4rem. --tabbar-space in index.css makes room for
                this bar - if you change the height, change that too. */}
            <div className='flex h-16 items-stretch px-1'>
                <LinkTab to='/' end icon={Home} label='Home' dimmed={somethingOpen} />

                <ButtonTab onClick={onSearch} icon={Search} label='Search' active={searchOpen} />

                <WriteButton />

                {/* The red number hides while you're on the Messages
                    page itself - you're already reading them. */}
                <LinkTab
                    to='/messages'
                    icon={MessageCircleMore}
                    label='Messages'
                    badge={onMessages ? 0 : unreadMessages}
                    dimmed={somethingOpen}
                />

                {/* ☰ turns into X while the menu is open. */}
                <ButtonTab onClick={onMenu} icon={menuOpen ? X : Menu} label='Menu' active={menuOpen} />
            </div>
        </nav>
    )
}

export default BottomNav
