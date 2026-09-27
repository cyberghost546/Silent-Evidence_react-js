import { useState, useEffect } from 'react'
import { CheckCheck } from 'lucide-react'
import { getNotifications, markNotificationsRead } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import NotificationItem from '../NotificationMenu/NotificationItem'


// ---------------------------------------------------------------
// ALL NOTIFICATIONS (/notifications) - logged in only.
// The bell in the header shows the newest 10; this page shows the
// last 100. Same rows as the bell (NotificationItem).
// ---------------------------------------------------------------
function NotificationsPage() {
    usePageTitle('Notifications')
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        getNotifications(100)
            .then(result => setData(result))
            .catch(() => setError('Could not load your notifications.'))
    }, [])

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

            {data?.items.length === 0 && (
                <PageMessage title='Nothing yet' text="When someone likes your story or follows you, you'll see it here." />
            )}

            {data?.items.length > 0 && (
                <>
                    <ul className='divide-y divide-gray-800 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60'>
                        {data.items.map(item => (
                            <li key={item.id}>
                                <NotificationItem item={item} onOpen={() => markRead(item)} />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </PageLayout>
    )
}

export default NotificationsPage
