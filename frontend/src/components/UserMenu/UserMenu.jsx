import { Link } from 'react-router-dom'
import {
    User, ChartColumnIncreasing, SquarePen, LayoutGrid, PanelRight,
    RefreshCw, BookOpen, MessageSquareMore, Mail, Clock, ClipboardList, Settings,
    LogOut, ChevronDown, BookOpenText, Brain, LifeBuoy, Crown,
} from 'lucide-react'
import { useDropdown } from '../../hooks/useDropdown'
import Avatar from '../Avatar/Avatar'
import { openWatcher } from '../SiteGuide/openWatcher'

// The red scrollbar with the little arrows ("menu-scroll").
import './UserMenu.css'


// ---------------------------------------------------------------
// THE MENU, AS DATA.
//
// Groups, drawn with a divider line between them. Adding a menu
// item = adding one line. (Same idea as NAV_ITEMS in the dashboard
// Sidebar.)
//
//   adminOnly: true = only staff users see it
//
// Most of these pages don't exist yet - they land on the "Page not
// found" page (the catch-all route in App.jsx) until they're built.
// ---------------------------------------------------------------
const MENU_GROUPS = [
    [
        { label: 'My Profile', to: '/profile', icon: User },
        { label: 'Author Dashboard', to: '/author', icon: ChartColumnIncreasing },
        { label: 'Write a Story', to: '/write', icon: SquarePen },
        { label: 'Admin Dashboard', to: '/dashboard', icon: LayoutGrid, adminOnly: true },
    ],
    [
        { label: 'Leaderboard', to: '/leaderboard', icon: ChartColumnIncreasing },
        { label: 'My Feed', to: '/feed', icon: PanelRight },
        { label: 'Random Story', to: '/random', icon: RefreshCw },
        { label: 'My Stories', to: '/my-stories', icon: BookOpen },
        { label: 'Messages', to: '/messages', icon: MessageSquareMore },
        { label: 'Co-author Invites', to: '/invites', icon: Mail },
        { label: 'Reading History', to: '/history', icon: Clock },
        { label: 'My Lists', to: '/lists', icon: ClipboardList },
        { label: 'Settings', to: '/settings', icon: Settings },
        // Pro members see it too - the page says until when they're Pro.
        { label: 'Silent Evidence Pro', to: '/premium', icon: Crown },
    ],
    // Help - its own group, so it gets its own divider line.
    // action = NOT a link: a button that opens a pop-up.
    //   'tour'    -> the Site Guide tour (components/SiteTour)
    //   'watcher' -> Ask The Watcher (components/SiteGuide)
    // See the JSX below.
    [
        { label: 'Site Guide', action: 'tour', icon: BookOpenText },
        { label: 'Ask The Watcher', action: 'watcher', icon: Brain },
        { label: 'Help & Support', to: '/support', icon: LifeBuoy },
    ],
]

// Every row has the same shape - written once. The COLOURS are kept
// separate, because the Log out row is red instead of grey.
//
// Why not just add 'text-red-400' after ITEM_STYLE? If an element
// gets two classes that set the same thing (text-gray-200 AND
// text-red-400), the one that wins is decided by Tailwind's own CSS
// order - NOT the order you wrote them in. Never rely on it.
const ITEM_BASE = 'flex w-full items-center gap-3.5 px-5 py-2.5 text-[15px] transition-colors hover:bg-gray-800'
const ITEM_STYLE = `${ITEM_BASE} text-gray-200 hover:text-white`
const LOGOUT_STYLE = `${ITEM_BASE} text-red-400 hover:text-red-300`


// Props come from Header:
//   user     - who is logged in: { username, email, is_staff, ... }
//   onOpenTour - a callback UP to Header: "please open the Site
//              Guide tour" (Header owns that pop-up).
//   onLogout - a callback UP to Header. This component cannot clear the
//              user itself; it only asks its parent to. State lives in
//              the parent, data flows down, callbacks go up.
function UserMenu({ user, onLogout, onOpenTour }) {
    // All the open / close / click-outside / Escape behaviour comes
    // from our useDropdown hook - the same one NavDropdown uses. No
    // need to write that logic a second time.
    const { open, toggle, close, ref } = useDropdown()

    // Take out the admin-only rows for normal users.
    // .map() goes over the groups, .filter() goes over the items in
    // each group - so the result has the same groups, just shorter.
    const groups = MENU_GROUPS.map(group =>
        group.filter(item => !item.adminOnly || user.is_staff)
    )

    return (
        // 'relative' = the anchor for the 'absolute' panel below.
        // The ref goes on this outer div - not the button - so clicks on
        // the button AND inside the panel both count as "inside".
        <div className='relative' ref={ref}>

            {/* ---------- THE BUTTON: avatar + little arrow ---------- */}
            <button
                type='button'
                onClick={toggle}
                aria-haspopup='menu'
                aria-expanded={open}
                aria-label='Account menu'
                className='flex items-center gap-1.5'
            >
                {/* Your photo, or your initials on a red circle
                    (components/Avatar/Avatar.jsx). */}
                <Avatar username={user.username} image={user.avatar} />

                {/* Spins upside down while the menu is open. */}
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* ---------- THE PANEL ---------- */}
            {open && (
                // The panel is a flex COLUMN with two parts:
                //   1. your name at the top - always visible
                //   2. the list of links - scrolls by itself
                //
                // max-h-[min(34rem,calc(100vh-5rem))] = at most 34rem
                // tall, and never taller than the window (minus room for
                // the header) - whichever is SMALLER. overflow-hidden
                // keeps the rounded corners neat.
                <div
                    role='menu'
                    className='absolute right-0 top-full z-50 mt-3 flex max-h-[min(34rem,calc(100vh-5rem))] w-72 flex-col overflow-hidden rounded-xl border border-gray-700/60 bg-gray-900 shadow-2xl'
                >
                    {/* ----- 1. Who's logged in (doesn't scroll) ----- */}
                    {/* shrink-0: never squashed, whatever the list does. */}
                    <Link to='/profile' onClick={close} className='block shrink-0 border-b border-gray-800 px-5 py-4 hover:bg-gray-800'>
                        <p className='font-bold text-white'>{user.username}</p>
                        <p className='text-sm text-gray-500'>View your profile</p>
                    </Link>

                    {/* ----- 2. The list (scrolls) ----- */}
                    {/* flex-1 + min-h-0 + overflow-y-auto = take the space
                        that's left, and scroll inside it. (min-h-0 is the
                        classic fix: without it, a flex child refuses to be
                        smaller than its content, so it never scrolls.)
                        menu-scroll = the red scrollbar with arrows
                        (UserMenu.css). */}
                    <div className='menu-scroll min-h-0 flex-1 overflow-y-auto pb-2'>

                    {/* ----- The groups of links ----- */}
                    {groups.map((group, index) => (
                        // border-t = the divider line above each group -
                        // except the FIRST (index 0): the name area above
                        // already has a line under it.
                        // key={index} is fine: the groups never change order.
                        <div key={index} className={index === 0 ? 'pt-2' : 'mt-2 border-t border-gray-800 pt-2'}>
                            {group.map(item => {
                                // The icon is a component stored in the item.
                                // Capital letter so JSX treats it as one: <Icon />
                                const Icon = item.icon

                                // A button instead of a link (Site Guide,
                                // Ask The Watcher) - both open a pop-up.
                                if (item.action) {
                                    return (
                                        <button
                                            key={item.label}
                                            type='button'
                                            role='menuitem'
                                            onClick={() => {
                                                close()
                                                if (item.action === 'tour') onOpenTour()
                                                else openWatcher()
                                            }}
                                            className={ITEM_STYLE}
                                        >
                                            <Icon className='h-[18px] w-[18px] text-gray-400' />
                                            {item.label}
                                        </button>
                                    )
                                }

                                return (
                                    // onClick={close}: <Link> changes page without
                                    // reloading, so the menu would stay open on the
                                    // next page unless we close it ourselves.
                                    <Link key={item.to} to={item.to} onClick={close} role='menuitem' className={ITEM_STYLE}>
                                        <Icon className='h-[18px] w-[18px] text-gray-400' />
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </div>
                    ))}

                    {/* ----- Log out ----- */}
                    <div className='mt-2 border-t border-gray-800 pt-2'>
                        {/* Two things happen: close the menu, then call the
                            prop. We don't know what onLogout does - that's
                            Header's business. We just call it. */}
                        <button
                            type='button'
                            role='menuitem'
                            onClick={() => { close(); onLogout() }}
                            className={LOGOUT_STYLE}
                        >
                            <LogOut className='h-[18px] w-[18px]' />
                            Log out
                        </button>
                    </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserMenu
