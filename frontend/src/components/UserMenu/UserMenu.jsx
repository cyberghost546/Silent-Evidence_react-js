import { Link } from 'react-router-dom'
import {
    User, ChartColumnIncreasing, SquarePen, LayoutGrid, Trophy, Newspaper,
    Shuffle, BookOpen, MessageSquare, Mail, Clock, ClipboardList, Settings,
    LogOut, ChevronDown, BookOpenText, Brain,
} from 'lucide-react'
import { useDropdown } from '../../hooks/useDropdown'
import Avatar from '../Avatar/Avatar'

// The red "dropdown-scroll" scrollbar from NavDropdown - built to be
// reused on anything that scrolls. Importing it here makes sure it's
// loaded even if NavDropdown ever isn't on the page.
import '../NavDropdown/NavDropdown.css'


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
        { label: 'Leaderboard', to: '/leaderboard', icon: Trophy },
        { label: 'My Feed', to: '/feed', icon: Newspaper },
        { label: 'Random Story', to: '/random', icon: Shuffle },
        { label: 'My Stories', to: '/my-stories', icon: BookOpen },
        { label: 'Messages', to: '/messages', icon: MessageSquare },
        { label: 'Co-author Invites', to: '/invites', icon: Mail },
        { label: 'Reading History', to: '/history', icon: Clock },
        { label: 'My Lists', to: '/lists', icon: ClipboardList },
        { label: 'Settings', to: '/settings', icon: Settings },
    ],
    // Help - its own group, so it gets its own divider line.
    // action: 'tour' = NOT a link: a button that opens the pop-up
    // Site Guide tour (components/SiteTour). See the JSX below.
    [
        { label: 'Site Guide', action: 'tour', icon: BookOpenText },
        { label: 'Ask The Watcher', to: '/watcher', icon: Brain },
    ],
]

// Every row has the same shape - written once. The COLOURS are kept
// separate, because the Log out row is red instead of grey.
//
// Why not just add 'text-red-400' after ITEM_STYLE? If an element
// gets two classes that set the same thing (text-gray-200 AND
// text-red-400), the one that wins is decided by Tailwind's own CSS
// order - NOT the order you wrote them in. Never rely on it.
const ITEM_BASE = 'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-800'
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
                // max-h-[calc(100vh-5rem)] = never taller than the window
                // (minus room for the header). If the menu is longer than
                // that, overflow-y-auto adds a scrollbar - and
                // dropdown-scroll makes that scrollbar red.
                <div
                    role='menu'
                    className='dropdown-scroll absolute right-0 top-full z-50 mt-3 max-h-[calc(100vh-5rem)] w-64 overflow-y-auto rounded-xl border border-gray-700/60 bg-gray-900 py-2 shadow-2xl'
                >
                    {/* ----- Who's logged in ----- */}
                    <Link to='/profile' onClick={close} className='block px-4 py-2 hover:bg-gray-800'>
                        <p className='font-bold text-white'>{user.username}</p>
                        <p className='text-xs text-gray-500'>View your profile</p>
                    </Link>

                    {/* ----- The groups of links ----- */}
                    {groups.map((group, index) => (
                        // border-t = the divider line above each group.
                        // key={index} is fine: the groups never change order.
                        <div key={index} className='mt-2 border-t border-gray-800 pt-2'>
                            {group.map(item => {
                                // The icon is a component stored in the item.
                                // Capital letter so JSX treats it as one: <Icon />
                                const Icon = item.icon

                                // A button instead of a link (Site Guide).
                                if (item.action === 'tour') {
                                    return (
                                        <button
                                            key={item.label}
                                            type='button'
                                            role='menuitem'
                                            onClick={() => {
                                                close()
                                                onOpenTour()
                                            }}
                                            className={ITEM_STYLE}
                                        >
                                            <Icon className='h-4 w-4 text-gray-400' />
                                            {item.label}
                                        </button>
                                    )
                                }

                                return (
                                    // onClick={close}: <Link> changes page without
                                    // reloading, so the menu would stay open on the
                                    // next page unless we close it ourselves.
                                    <Link key={item.to} to={item.to} onClick={close} role='menuitem' className={ITEM_STYLE}>
                                        <Icon className='h-4 w-4 text-gray-400' />
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
                            <LogOut className='h-4 w-4' />
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserMenu
