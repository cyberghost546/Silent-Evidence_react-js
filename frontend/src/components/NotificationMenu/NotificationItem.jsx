import { Link } from 'react-router-dom'
import { Heart, MessageSquare, UserPlus, Mail, LifeBuoy, Bell, Reply, Eye, Trophy, Flame } from 'lucide-react'
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
    challenge: { icon: Trophy, color: 'bg-yellow-500/15 text-yellow-300' },
    tip: { icon: Flame, color: 'bg-amber-500/15 text-amber-300' },
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
            // A rounded row (rounded-2xl), like in social apps.
            // Unread rows get a faint red tint, so they stand out.
            // py-3 = a comfortable size to tap with a thumb.
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/5 ${item.is_read ? '' : 'bg-red-600/[0.07]'}`}
        >
            {/* Coloured round icon - big (h-11), like an avatar in a
                social app's notification list. */}
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${color}`}>
                <Icon className='h-5 w-5' />
            </span>

            {/* Text + time. min-w-0 lets long text wrap instead of
                pushing the panel wider. leading-snug = lines a bit
                closer together, so a 2-line notification stays compact. */}
            <div className='min-w-0 flex-1'>
                <p className={`text-sm leading-snug ${item.is_read ? 'text-gray-400' : 'font-medium text-white'}`}>{item.text}</p>
                <p className={`mt-1 text-xs ${item.is_read ? 'text-gray-500' : 'font-semibold text-red-400'}`}>{timeAgo(item.created_at)}</p>
            </div>

            {/* Red dot = still unread. The text gets bolder and the time
                turns red too, so it's not the dot's colour alone. */}
            {!item.is_read && (
                <span className='h-2.5 w-2.5 shrink-0 rounded-full bg-red-500' aria-label='Unread' />
            )}
        </Link>
    )
}

export default NotificationItem
