import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { openMessages } from './openMessages'


// ---------------------------------------------------------------
// /messages and /messages/:username - the old addresses of the
// Messages PAGE. Messages is a pop-up now (MessagesPopup.jsx), but
// links to these addresses still exist (the Site Guide, the tour,
// old bookmarks), so they keep working: this opens the pop-up and
// sends you to the home page underneath it.
//
// The same trick as /watcher (SiteGuide/WatcherRoute.jsx).
// ---------------------------------------------------------------
function MessagesRoute() {
    // '' on plain /messages, 'raven' on /messages/raven.
    const { username = '' } = useParams()

    useEffect(() => {
        // setTimeout 0 = "right after this render finishes", so Header
        // is surely listening before the event is sent.
        // No clearTimeout on purpose: <Navigate> below unmounts this
        // component straight away, which would cancel the timer.
        setTimeout(() => openMessages(username), 0)
    }, [username])

    // replace: /messages doesn't stay in the history, so Back doesn't
    // bounce you here again.
    return <Navigate to='/' replace />
}

export default MessagesRoute
