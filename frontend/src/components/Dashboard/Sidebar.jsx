import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { GridIcon, PhotoIcon, UsersIcon, BookIcon, TagIcon, ArrowLeftIcon, LogoutIcon } from './DashboardIcons'
import {
    Bot, Flag, TriangleAlert, Gavel, ShieldCheck, Map, ShieldAlert, TrendingUp, Funnel, Swords,
    Megaphone, Trophy, Mail, LifeBuoy, Newspaper, MessageSquare, Package, PenLine,
    Cookie, CircleCheck, DollarSign, Crown, Ban, ShieldX, Search, Tag, Clock, Send, HeartPulse, Moon,
} from 'lucide-react'
import styles from './Dashboard.module.css'


// ---------------------------------------------------------------
// THE MENU, AS DATA.
//
// The sidebar is built from this list with .map(), so adding a
// page to the menu = adding one line here. (Plus the <Route> in
// App.jsx and the page component itself - see Overview.jsx.)
//
//   to   - the URL. No `to` = the page doesn't exist yet, so it's
//          shown greyed out with a "soon" tag.
//   end  - only for Overview, see the NavLink comment below.
// ---------------------------------------------------------------
const ICON = 'h-5 w-5 shrink-0'

const NAV_ITEMS = [
    { label: 'Overview', to: '/dashboard', icon: <GridIcon />, end: true },
    { label: 'Users', to: '/dashboard/users', icon: <UsersIcon /> },
    { label: 'Stories', to: '/dashboard/stories', icon: <BookIcon /> },

    // The newer pages use lucide-react icons. ICON is the same size
    // as the hand-made icons (w-5 h-5).
    { label: 'AI Generator', to: '/dashboard/ai', icon: <Bot className={ICON} /> },
    { label: 'Moderation', to: '/dashboard/moderation', icon: <Flag className={ICON} /> },
    { label: 'Reports', to: '/dashboard/reports', icon: <TriangleAlert className={ICON} /> },
    { label: 'Appeals', to: '/dashboard/appeals', icon: <Gavel className={ICON} /> },
    { label: 'Login Logs', to: '/dashboard/login-logs', icon: <ShieldCheck className={ICON} /> },
    { label: 'Login Map', icon: <Map className={ICON} /> },
    { label: 'Security', to: '/dashboard/security', icon: <ShieldAlert className={ICON} /> },
    { label: 'Analytics', icon: <TrendingUp className={ICON} /> },
    { label: 'Conversion Funnel', to: '/dashboard/funnel', icon: <Funnel className={ICON} /> },
    { label: 'Challenges', to: '/dashboard/challenges', icon: <Swords className={ICON} /> },
    { label: 'Slideshow', to: '/dashboard/slides', icon: <PhotoIcon /> },
    { label: 'Categories', to: '/dashboard/categories', icon: <TagIcon /> },
    { label: 'Announcement', to: '/dashboard/announcements', icon: <Megaphone className={ICON} /> },
    { label: 'Story of Week', to: '/dashboard/story-of-week', icon: <Trophy className={ICON} /> },
    { label: 'Contact Inbox', to: '/dashboard/contact', icon: <Mail className={ICON} /> },
    { label: 'User Support', to: '/dashboard/support', icon: <LifeBuoy className={ICON} /> },
    { label: 'Newsletter', to: '/dashboard/newsletter', icon: <Newspaper className={ICON} /> },
    { label: 'Comment Digest', to: '/dashboard/digest', icon: <MessageSquare className={ICON} /> },
    { label: 'Bundles', to: '/dashboard/bundles', icon: <Package className={ICON} /> },
    { label: 'Writing Prompts', to: '/dashboard/prompts', icon: <PenLine className={ICON} /> },
    { label: 'Cookie Consent', to: '/dashboard/cookies', icon: <Cookie className={ICON} /> },
    { label: 'Verification', to: '/dashboard/verification', icon: <CircleCheck className={ICON} /> },
    { label: 'Revenue', to: '/dashboard/revenue', icon: <DollarSign className={ICON} /> },
    { label: 'Premium Members', to: '/dashboard/premium', icon: <Crown className={ICON} /> },
    { label: 'Content Filter', to: '/dashboard/content-filter', icon: <Ban className={ICON} /> },
    { label: 'Warnings & Bans', to: '/dashboard/discipline', icon: <ShieldX className={ICON} /> },
    { label: 'Admin Search', icon: <Search className={ICON} /> },
    { label: 'Tag Manager', to: '/dashboard/tags', icon: <Tag className={ICON} /> },
    { label: 'Scheduled Stories', to: '/dashboard/scheduled', icon: <Clock className={ICON} /> },
    { label: 'Email Log', icon: <Send className={ICON} /> },
    { label: 'Site Health', icon: <HeartPulse className={ICON} /> },
    { label: 'Mood of Day', to: '/dashboard/moods', icon: <Moon className={ICON} /> },
]


// Shared look for every row, plus the two states.
const ITEM_STYLE = 'flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors'
const ACTIVE_STYLE = 'border-red-800 bg-red-950/60 text-white'
const NORMAL_STYLE = 'border-transparent text-gray-400 hover:bg-gray-800/60 hover:text-white'


function Sidebar() {
    const { user, logout } = useAuth()

    return (
        // h-screen + sticky top-0 = the sidebar stays put while the
        // page on the right scrolls. overflow-y-auto = if the menu is
        // taller than the screen, the sidebar scrolls on its own.
        <aside className={`${styles.sidebar} sticky top-0 flex h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-gray-800 bg-gray-900/50`}>

            {/* ---------- LOGO ---------- */}
            <div className='border-b border-gray-800 px-5 py-4'>
                <p className='text-xs text-gray-500'>Admin Panel</p>
                <p className='font-bold text-red-600'>Silent Evidence</p>
            </div>

            {/* ---------- MENU ---------- */}
            <nav className='flex-1 space-y-1 p-3'>
                {NAV_ITEMS.map(item => {
                    // No page yet: a plain <div>, not a link.
                    if (!item.to) {
                        return (
                            <div key={item.label} className={`${ITEM_STYLE} border-transparent cursor-not-allowed text-gray-600`}>
                                {item.icon}
                                {item.label}
                                <span className='ml-auto rounded bg-gray-800 px-1.5 text-[10px] uppercase text-gray-500'>soon</span>
                            </div>
                        )
                    }

                    // NavLink = a <Link> that knows if it matches the
                    // current URL. Instead of a string, className can
                    // be a FUNCTION that gets { isActive } and returns
                    // the classes - so the current page is highlighted.
                    //
                    // end: without it, "/dashboard" would also count as
                    // active on "/dashboard/slides" (it's the start of
                    // that URL), and two items would light up at once.
                    return (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `${ITEM_STYLE} ${isActive ? ACTIVE_STYLE : NORMAL_STYLE}`}
                        >
                            {item.icon}
                            {item.label}
                        </NavLink>
                    )
                })}
            </nav>

            {/* ---------- BOTTOM: back to site + who's logged in ---------- */}
            <div className='space-y-1 border-t border-gray-800 p-3'>
                <Link to='/' className={`${ITEM_STYLE} ${NORMAL_STYLE}`}>
                    <ArrowLeftIcon />
                    Back to site
                </Link>

                <div className='flex items-center gap-3 px-3 py-2'>
                    {/* First letter of the username as a round avatar. */}
                    <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-900 text-sm font-bold text-red-100'>
                        {user.username[0].toUpperCase()}
                    </span>

                    {/* min-w-0 + truncate: a very long username gets "..."
                        instead of pushing the logout button off the edge. */}
                    <span className='min-w-0 flex-1 truncate text-sm text-gray-300'>{user.username}</span>

                    {/* After logout, ProtectedRoute sees user = null and
                        sends us to /login automatically. */}
                    <button
                        type='button'
                        onClick={logout}
                        aria-label='Log out'
                        className='text-gray-500 transition-colors hover:text-red-500'
                    >
                        <LogoutIcon />
                    </button>
                </div>
            </div>
        </aside>
    )
}

export default Sidebar
