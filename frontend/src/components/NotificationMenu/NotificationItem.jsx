import { Link } from 'react-router-dom'
import { Heart, MessageSquare, UserPlus, Mail, LifeBuoy, Bell, Reply, Eye } from 'lucide-react'
import { timeAgo } from '../../utils/format'


// ---------------------------------------------------------------
// ICON + COLOUR FOR EACH KIND of notification.
//
// A lookup object instead of a big if/else. To add a new kind, add
// one line here (and the kind in Django: Notification.KINDS in
// accounts/models.py). An unknown kind falls back to a plain bell.
// ---------------------------------------------------------------
const KINDS = {
    like: { icon: Heart, color: 'bg-red-500/15 text-red-400' },
    comment: { icon: MessageSquare, color: 'bg-blue-500/15 text-blue-400' },
    follow: { icon: UserPlus, color: 'bg-green-500/15 text-green-400' },
    invite: { icon: Mail, color: 'bg-amber-500/15 text-amber-400' },
    support: { icon: LifeBuoy, color: 'bg-purple-500/15 text-purple-300' },
    reply: { icon: Reply, color: 'bg-sky-500/15 text-sky-300' },
    truestory: { icon: Eye, color: 'bg-orange-500/15 text-orange-300' },
}
const FALLBACK = { icon: Bell, color: 'bg-slate-500/15 text-slate-300' }


// ---------------------------------------------------------------
// ONE NOTIFICATION ROW - used by the bell's dropdown AND the full
// /notifications page, so they always look the same.
//
//   <NotificationItem item={n} onOpen={() => markRead(n)} />
//
// item   = one notification from Django ({ kind, text, link, is_read, created_at })
// onOpen = called when it's clicked (before the page changes)
// ---------------------------------------------------------------
function NotificationItem({ item, onOpen, role }) {
    // Capital "Icon" so JSX treats it as a component.
    const { icon: Icon, color } = KINDS[item.kind] || FALLBACK

    return (
        <Link
            to={item.link}
            role={role}
            onClick={onOpen}
            // Unread rows get a slightly lighter background.
            className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-800 ${item.is_read ? '' : 'bg-gray-800/40'}`}
        >
            {/* Coloured round icon */}
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}>
                <Icon className='h-4 w-4' />
            </span>

            {/* Text + time. min-w-0 lets long text wrap instead of
                pushing the panel wider. */}
            <div className='min-w-0 flex-1'>
                <p className={`text-sm ${item.is_read ? 'text-gray-400' : 'text-gray-100'}`}>{item.text}</p>
                <p className='mt-0.5 text-xs text-gray-500'>{timeAgo(item.created_at)}</p>
            </div>

            {/* Little red dot = still unread. The text colour changes
                too, so it's not colour alone. */}
            {!item.is_read && (
                <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500' aria-label='Unread' />
            )}
        </Link>
    )
}

export default NotificationItem
