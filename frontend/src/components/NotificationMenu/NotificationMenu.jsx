import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, CheckCheck, X } from 'lucide-react'
import { useDropdown } from '../../hooks/useDropdown'
import { getNotifications, markNotificationsRead } from '../../api/client'
import NotificationList from './NotificationList'

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
                // The same round button as search and messages next to
                // it (ICON_BUTTON in Header.jsx - keep the two the same).
                // When open it's brighter, so you can see which menu is showing.
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-white sm:h-9 sm:w-9 ${
                    open ? 'bg-white/15 text-white' : 'text-gray-300'
                }`}
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
                <>
                    {/* PHONES: a dark layer over the page behind the sheet.
                        Tapping it closes the sheet. sm:hidden = phones only
                        (on big screens the panel is a normal dropdown).
                        aria-hidden: it's only decoration for screen readers. */}
                    <div onClick={close} aria-hidden='true' className='fixed inset-0 z-[60] bg-black/60 sm:hidden' />

                    <div
                        role='menu'
                        aria-label='Notifications'
                        // PHONES: a "bottom sheet" - glued to the bottom of
                        // the screen (fixed inset-x-0 bottom-0), round top
                        // corners, at most 85% of the screen tall (85dvh).
                        // flex flex-col: header on top, list in the middle
                        // (it scrolls), link at the bottom.
                        //
                        // FROM "sm" UP: the normal dropdown under the bell -
                        // every sm: class undoes a phone one (absolute
                        // instead of fixed, w-96, round on all corners...).
                        //
                        // No border line on phones: a top-only border fades
                        // out oddly where it bends into the round corners.
                        // The slightly lighter colour (bg-slate-900) and the
                        // shadow going UP (the -10px) show the edge instead.
                        // sm: = a darker panel with a thin border all round.
                        className='fixed inset-x-0 bottom-0 z-[60] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] sm:absolute sm:border-white/10 sm:bg-slate-950 sm:shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-3 sm:max-h-[min(34rem,calc(100vh-6rem))] sm:w-96 sm:rounded-2xl sm:border'
                    >
                        {/* The little grey bar at the top of a phone sheet
                            ("drag handle") - it tells people "this is a
                            sheet". Just a picture, phones only. */}
                        <div className='flex justify-center pt-3 sm:hidden' aria-hidden='true'>
                            <span className='h-1.5 w-10 rounded-full bg-slate-700' />
                        </div>

                        {/* ----- Top row: title + "mark all read" + close ----- */}
                        <div className='flex items-center gap-2 px-4 pt-3 pb-3 sm:pt-4'>
                            <p className='mr-auto text-lg font-bold text-white'>Notifications</p>

                            {/* No point showing this button if nothing is unread. */}
                            {unreadCount > 0 && (
                                <button
                                    type='button'
                                    onClick={markAllRead}
                                    className='flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-red-400 hover:bg-white/5 hover:text-red-300'
                                >
                                    <CheckCheck className='h-4 w-4' />
                                    Mark all as read
                                </button>
                            )}

                            {/* ✕ - phones only. Big screens close it by
                                clicking anywhere else, or with Esc. */}
                            <button
                                type='button'
                                onClick={close}
                                aria-label='Close notifications'
                                className='flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gray-200 hover:bg-white/20 sm:hidden'
                            >
                                <X className='h-4 w-4' />
                            </button>
                        </div>

                        {/* ----- The list ----- */}
                        {/* flex-1 + min-h-0 + overflow-y-auto = this part
                            takes the space that's left and scrolls by
                            itself, while the top row and the link stay put.
                            overscroll-contain: reaching the end doesn't
                            scroll the page behind. */}
                        <div className='dropdown-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2'>
                            {data ? (
                                <NotificationList
                                    items={items}
                                    itemRole='menuitem'
                                    onOpen={item => { markRead(item); close() }}
                                />
                            ) : (
                                <p className='px-4 py-10 text-center text-sm text-gray-500'>Loading...</p>
                            )}
                        </div>

                        {/* ----- Bottom link to the full page ----- */}
                        {/* pb-[...env(...)]: on an iPhone the link stays
                            above the swipe bar at the very bottom. */}
                        <Link
                            to='/notifications'
                            onClick={close}
                            className='block border-t border-white/10 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white sm:pb-3'
                        >
                            See all notifications
                        </Link>
                    </div>
                </>
            )}
        </div>
    )
}

export default NotificationMenu
