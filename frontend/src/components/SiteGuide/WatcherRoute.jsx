import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { openWatcher } from './openWatcher'


// ---------------------------------------------------------------
// /watcher - there's no Watcher PAGE any more: it's a pop-up now
// (AskTheWatcher.jsx, shown by Header). This keeps old links and
// bookmarks working: go to the home page and open the pop-up there.
// ---------------------------------------------------------------
function WatcherRoute() {
    useEffect(() => {
        // setTimeout 0 = "right after this render finishes", so Header
        // is surely listening before the event is sent.
        // No clearTimeout on purpose: <Navigate> below unmounts this
        // component straight away, which would cancel the timer.
        setTimeout(openWatcher, 0)
    }, [])

    // replace: /watcher doesn't stay in the history, so Back doesn't
    // bounce you here again.
    return <Navigate to='/' replace />
}

export default WatcherRoute
