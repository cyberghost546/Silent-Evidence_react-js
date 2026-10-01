import { CheckCheck } from 'lucide-react'
import { getNotifications, markNotificationsRead } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useApi } from '../../hooks/useApi'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import NotificationList from '../NotificationMenu/NotificationList'


// ---------------------------------------------------------------
// ALL NOTIFICATIONS (/notifications) - logged in only.
// The bell in the header shows the newest 10; this page shows the
// last 100. Same rows as the bell (NotificationItem).
// ---------------------------------------------------------------
function NotificationsPage() {
    usePageTitle('Notifications')
    // useApi = load + error + loading in one line (hooks/useApi.js).
    const { data, error, setData } = useApi(() => getNotifications(100))

    function markRead(item) {
        if (item.is_read) return
        markNotificationsRead([item.id]).catch(() => {})
    }

    function markAllRead() {
        setData({ unread: 0, items: data.items.map(n => ({ ...n, is_read: true })) })
        markNotificationsRead().catch(() => {})
    }

    // PageLayout's `action` = the spot next to the title, for a button.
    const markAllButton = data?.unread > 0 && (
        <button type='button' onClick={markAllRead} className='flex items-center gap-1 text-sm text-red-400 hover:text-red-300'>
            <CheckCheck className='h-4 w-4' /> Mark all as read ({data.unread})
        </button>
    )

    return (
        <PageLayout title='Notifications' subtitle='Likes, comments, follows and replies - newest first.' action={markAllButton} width='narrow'>
            {error && <PageMessage title='Something went wrong' text={error} />}
            {!data && !error && <PageMessage title='Loading...' />}

            {/* The same list as the bell's panel (NotificationList):
                All / Unread tabs, grouped into Today / This week /
                Earlier. It shows its own "nothing yet" message.
                -mx-4 on phones: the rows run closer to the screen
                edges, like a phone app; sm: puts them back in a card. */}
            {data && (
                <div className='-mx-4 sm:mx-0 sm:rounded-3xl sm:border sm:border-white/10 sm:bg-slate-950/60 sm:py-4'>
                    <NotificationList items={data.items} onOpen={markRead} />
                </div>
            )}
        </PageLayout>
    )
}

export default NotificationsPage
