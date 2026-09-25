import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Heart, MessageSquare, UserPlus, Mail, CheckCheck } from 'lucide-react'
import { useDropdown } from '../../hooks/useDropdown'

// The red "dropdown-scroll" scrollbar, same as UserMenu uses.
import '../NavDropdown/NavDropdown.css'


// ---------------------------------------------------------------
// FAKE NOTIFICATIONS (for now).
//
// There is no notifications API in Django yet, so this list is
// hardcoded. When the backend is ready, replace this with a fetch
// (like api/categories.js) and keep the same shape for each item:
//
//   id     - unique number, used as the React key
//   type   - picks the icon + colour from NOTIFICATION_TYPES below
//   text   - the message shown to the user
//   time   - already-formatted text like '5m ago'
//   to     - the page to go to when it's clicked
//   read   - false = new (shows the red dot)
// ---------------------------------------------------------------
const SAMPLE_NOTIFICATIONS = [
    { id: 1, type: 'like', text: 'Sarah liked your story "The Lake House"', time: '5m ago', to: '/my-stories', read: false },
    { id: 2, type: 'comment', text: 'Mike commented on "Missing in Oregon"', time: '1h ago', to: '/my-stories', read: false },
    { id: 3, type: 'follow', text: 'detective_jane started following you', time: '3h ago', to: '/profile', read: false },
    { id: 4, type: 'invite', text: 'You were invited to co-author "Cold Trail"', time: '1d ago', to: '/invites', read: true },
    { id: 5, type: 'comment', text: 'Alex replied to your comment', time: '2d ago', to: '/feed', read: true },
]


// ---------------------------------------------------------------
// ICON + COLOUR FOR EACH TYPE.
//
// A lookup object instead of a big if/else. To add a new kind of
// notification, add one line here - nothing else has to change.
// ---------------------------------------------------------------
const NOTIFICATION_TYPES = {
    like: { icon: Heart, color: 'bg-red-500/15 text-red-400' },
    comment: { icon: MessageSquare, color: 'bg-blue-500/15 text-blue-400' },
    follow: { icon: UserPlus, color: 'bg-green-500/15 text-green-400' },
    invite: { icon: Mail, color: 'bg-amber-500/15 text-amber-400' },
}


function NotificationMenu() {
    // Open / close / click-outside / Escape - all from our shared hook.
    // Same one UserMenu and NavDropdown use.
    const { open, toggle, close, ref } = useDropdown()

    // The list lives in state because marking something as read
    // CHANGES it, and the badge number has to update on screen.
    const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS)

    // We don't store the unread count in its own state - we just
    // count it from the list every render. One source of truth,
    // so the number can never get out of sync with the list.
    const unreadCount = notifications.filter(n => !n.read).length

    // Mark ONE notification as read.
    // We never change the old array (React wouldn't notice). .map()
    // makes a NEW array, and { ...n, read: true } makes a new copy
    // of just the one that was clicked.
    function markAsRead(id) {
        setNotifications(list =>
            list.map(n => (n.id === id ? { ...n, read: true } : n))
        )
    }

    // Mark EVERYTHING as read - same idea, no if needed.
    function markAllAsRead() {
        setNotifications(list => list.map(n => ({ ...n, read: true })))
    }

    return (
        // 'relative' so the panel below can be placed under the bell.
        <div className='relative' ref={ref}>

            {/* ---------- THE BELL BUTTON ---------- */}
            <button
                type='button'
                onClick={toggle}
                aria-haspopup='menu'
                aria-expanded={open}
                aria-label={`Notifications (${unreadCount} unread)`}
                // When open, the button gets a dark box behind it so you
                // can see which menu is showing.
                className={`relative rounded-lg p-2 transition-colors hover:text-white ${open ? 'bg-slate-800 text-white' : 'text-gray-300'}`}
            >
                <Bell className='h-5 w-5' />

                {/* The red number badge. Only shows if there's something
                    unread. 9+ stops it from getting too wide. */}
                {unreadCount > 0 && (
                    <span className='absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-slate-900'>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* ---------- THE PANEL ---------- */}
            {open && (
                <div
                    role='menu'
                    className='absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-xl border border-gray-700/60 bg-gray-900 shadow-2xl'
                >
                    {/* ----- Top row: title + "mark all read" ----- */}
                    <div className='flex items-center justify-between border-b border-gray-800 px-4 py-3'>
                        <p className='font-bold text-white'>Notifications</p>

                        {/* No point showing this button if nothing is unread. */}
                        {unreadCount > 0 && (
                            <button
                                type='button'
                                onClick={markAllAsRead}
                                className='flex items-center gap-1 text-xs text-red-400 hover:text-red-300'
                            >
                                <CheckCheck className='h-3.5 w-3.5' />
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* ----- The list (or an empty message) ----- */}
                    {notifications.length === 0 ? (
                        <p className='px-4 py-8 text-center text-sm text-gray-500'>
                            You're all caught up!
                        </p>
                    ) : (
                        // max-h + overflow-y-auto = scrolls if the list is long.
                        <ul className='dropdown-scroll max-h-96 overflow-y-auto'>
                            {notifications.map(n => {
                                // Look up the icon + colour for this type.
                                // Capital "Icon" so JSX treats it as a component.
                                const { icon: Icon, color } = NOTIFICATION_TYPES[n.type]

                                return (
                                    <li key={n.id}>
                                        {/* Clicking one: mark it read, close the
                                            panel, and go to its page. */}
                                        <Link
                                            to={n.to}
                                            role='menuitem'
                                            onClick={() => { markAsRead(n.id); close() }}
                                            // Unread rows get a slightly lighter background.
                                            className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-800 ${n.read ? '' : 'bg-gray-800/40'}`}
                                        >
                                            {/* Coloured round icon */}
                                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}>
                                                <Icon className='h-4 w-4' />
                                            </span>

                                            {/* Text + time. min-w-0 lets long text wrap
                                                instead of pushing the panel wider. */}
                                            <div className='min-w-0 flex-1'>
                                                <p className={`text-sm ${n.read ? 'text-gray-400' : 'text-gray-100'}`}>
                                                    {n.text}
                                                </p>
                                                <p className='mt-0.5 text-xs text-gray-500'>{n.time}</p>
                                            </div>

                                            {/* Little red dot = still unread */}
                                            {!n.read && (
                                                <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500' />
                                            )}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    {/* ----- Bottom link to a full page ----- */}
                    <Link
                        to='/notifications'
                        onClick={close}
                        className='block border-t border-gray-800 py-2.5 text-center text-sm text-gray-300 hover:bg-gray-800 hover:text-white'
                    >
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    )
}

export default NotificationMenu
