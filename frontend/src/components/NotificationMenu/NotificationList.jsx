import { useState } from 'react'
import { BellOff } from 'lucide-react'
import NotificationItem from './NotificationItem'


// ---------------------------------------------------------------
// THE LIST OF NOTIFICATIONS, social-app style - used by the bell's
// panel AND the /notifications page, so both look the same.
//
//   [ All ]  [ Unread 3 ]          <- tabs
//
//   TODAY
//   (♥) raven liked "Static"            2h   •
//   (+) mara_k started following you    5h   •
//   THIS WEEK
//   (💬) nightowl commented ...          3d
//   EARLIER
//   ...
//
// Usage:
//   <NotificationList items={items} onOpen={item => markRead(item)} />
//
//   items    = notifications from Django, newest first
//   onOpen   = called with the notification that was tapped
//   itemRole = optional, e.g. 'menuitem' inside the bell's menu
// ---------------------------------------------------------------


// Which group does a date belong in?
function groupName(isoString) {
    const date = new Date(isoString)
    const now = new Date()

    // toDateString() = "Thu Oct 01 2026" - the same text means the
    // same calendar day, whatever the time.
    if (date.toDateString() === now.toDateString()) return 'Today'

    // 7 days in milliseconds: 7 days x 24 hours x 60 min x 60 s x 1000 ms.
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    if (now - date < sevenDays) return 'This week'

    return 'Earlier'
}

// Turns the list into groups, keeping the order (newest first):
//   [ { title: 'Today', items: [...] }, { title: 'Earlier', items: [...] } ]
// A group with nothing in it is simply never made.
function groupByDate(items) {
    const groups = []

    for (const item of items) {
        const title = groupName(item.created_at)
        // The items are newest first, so a new group name only ever
        // appears AFTER the previous group is finished. So we only
        // need to look at the LAST group.
        const last = groups[groups.length - 1]

        if (last && last.title === title) {
            last.items.push(item)
        } else {
            groups.push({ title, items: [item] })
        }
    }

    return groups
}


// One tab button. `active` = the one that's picked.
function Tab({ label, count, active, onClick }) {
    return (
        <button
            type='button'
            onClick={onClick}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                active ? 'bg-white text-slate-900' : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
        >
            {label}
            {/* The little red number on "Unread". */}
            {count > 0 && (
                <span className='flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white'>
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </button>
    )
}


function NotificationList({ items, onOpen, itemRole }) {
    // Which tab is picked: 'all' or 'unread'.
    const [tab, setTab] = useState('all')

    const unreadCount = items.filter(item => !item.is_read).length
    const shown = tab === 'unread' ? items.filter(item => !item.is_read) : items
    const groups = groupByDate(shown)

    return (
        <div>
            {/* ---------- TABS ---------- */}
            <div className='flex gap-2 px-4 pb-2'>
                <Tab label='All' active={tab === 'all'} onClick={() => setTab('all')} />
                <Tab label='Unread' count={unreadCount} active={tab === 'unread'} onClick={() => setTab('unread')} />
            </div>

            {/* ---------- NOTHING TO SHOW ---------- */}
            {groups.length === 0 && (
                <div className='flex flex-col items-center px-6 py-12 text-center'>
                    <span className='flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-gray-500'>
                        <BellOff className='h-6 w-6' />
                    </span>
                    <p className='mt-4 font-semibold text-gray-200'>
                        {tab === 'unread' ? "You're all caught up!" : 'No notifications yet'}
                    </p>
                    <p className='mt-1 text-sm text-gray-500'>
                        Likes, comments and new followers will show up here.
                    </p>
                </div>
            )}

            {/* ---------- THE GROUPS ---------- */}
            {groups.map(group => (
                <section key={group.title} className='px-2 pt-3'>
                    <h3 className='px-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-500'>
                        {group.title}
                    </h3>
                    <ul className='space-y-0.5'>
                        {group.items.map(item => (
                            <li key={item.id}>
                                <NotificationItem item={item} role={itemRole} onOpen={() => onOpen(item)} />
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    )
}

export default NotificationList
