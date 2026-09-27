import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useDropdown } from '../../hooks/useDropdown'
import { getNotifications, markNotificationsRead } from '../../api/client'
import NotificationItem from './NotificationItem'

// The red "dropdown-scroll" scrollbar, same as UserMenu uses.
import '../NavDropdown/NavDropdown.css'


// ---------------------------------------------------------------
// THE BELL in the header (only shown when you're logged in).
//
// The notifications come from Django (accounts/notification_views.py).
// They're made automatically when someone likes or comments on your
// story, follows you, invites you to co-author, or support answers
// your ticket (see notify() in accounts/notifications.py).
//
// The red number is checked every 30 seconds and on every page
// change - the same trick as the Messages icon (MessagesLink in
// Header.jsx). Clicking a notification marks it read and opens it.
// ---------------------------------------------------------------
const REFRESH_EVERY = 30000   // milliseconds = 30 seconds


function NotificationMenu() {
    // Open / close / click-outside / Escape - all from our shared hook.
    // Same one UserMenu and NavDropdown use.
    const { open, toggle, close, ref } = useDropdown()

    // null = not loaded yet. Otherwise { unread, items }.
    const [data, setData] = useState(null)
    const location = useLocation()

    useEffect(() => {
        let ignore = false
        function load() {
            getNotifications(10)
                .then(result => {
                    if (!ignore) setData(result)
                })
                .catch(() => {})   // the bell isn't worth an error message
        }
        load()
        // setInterval = "run load again every 30 seconds".
        const timer = setInterval(load, REFRESH_EVERY)
        // Cleanup: stop the timer when the page changes or the header
        // disappears (logout) - otherwise timers would pile up.
        return () => {
            ignore = true
            clearInterval(timer)
        }
    }, [location.pathname])

    const unreadCount = data?.unread ?? 0
    const items = data?.items ?? []

    // Mark ONE as read. Update the screen straight away (so it feels
    // instant), then tell Django. .map() makes a NEW array - React only
    // notices changes when it gets a new array.
    function markRead(item) {
        if (item.is_read) return
        setData({
            unread: Math.max(0, unreadCount - 1),
            items: items.map(n => (n.id === item.id ? { ...n, is_read: true } : n)),
        })
        markNotificationsRead([item.id]).catch(() => {})
    }

    // Mark EVERYTHING as read - same idea.
    function markAllRead() {
        setData({ unread: 0, items: items.map(n => ({ ...n, is_read: true })) })
        markNotificationsRead().catch(() => {})
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
                    // w-80 but never wider than the phone screen minus a gap.
                    className='absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-700/60 bg-gray-900 shadow-2xl'
                >
                    {/* ----- Top row: title + "mark all read" ----- */}
                    <div className='flex items-center justify-between border-b border-gray-800 px-4 py-3'>
                        <p className='font-bold text-white'>Notifications</p>

                        {/* No point showing this button if nothing is unread. */}
                        {unreadCount > 0 && (
                            <button
                                type='button'
                                onClick={markAllRead}
                                className='flex items-center gap-1 text-xs text-red-400 hover:text-red-300'
                            >
                                <CheckCheck className='h-3.5 w-3.5' />
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* ----- The list (or an empty message) ----- */}
                    {items.length === 0 ? (
                        <p className='px-4 py-8 text-center text-sm text-gray-500'>
                            {data ? "You're all caught up!" : 'Loading...'}
                        </p>
                    ) : (
                        // max-h + overflow-y-auto = scrolls if the list is long.
                        <ul className='dropdown-scroll max-h-96 overflow-y-auto'>
                            {items.map(item => (
                                <li key={item.id}>
                                    <NotificationItem item={item} role='menuitem' onOpen={() => { markRead(item); close() }} />
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* ----- Bottom link to the full page ----- */}
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
