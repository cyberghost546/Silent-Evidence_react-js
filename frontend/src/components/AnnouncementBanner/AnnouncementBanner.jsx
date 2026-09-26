import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, X } from 'lucide-react'
import { getAnnouncement } from '../../api/client'
import { BANNER_STYLES } from './bannerStyles'


// ---------------------------------------------------------------
// The announcement banner at the very top of every public page
// (SiteLayout puts it above the Header).
//
// Admins write it on Admin Dashboard -> Announcement. Nothing
// switched on = nothing shown at all.
//
// The × hides it for this visitor. We remember WHICH announcement
// they closed (its id) in localStorage - so a NEW announcement
// still shows up, even for people who closed the old one.
// ---------------------------------------------------------------

const CLOSED_KEY = 'closedAnnouncement'

// localStorage can throw in some private-browsing modes - so both
// helpers are wrapped in try/catch (same as AgeGate.jsx).
function getClosedId() {
    try {
        return localStorage.getItem(CLOSED_KEY)
    } catch {
        return null
    }
}

function rememberClosed(id) {
    try {
        localStorage.setItem(CLOSED_KEY, String(id))
    } catch {
        // Not saved: it just shows again next visit.
    }
}


function AnnouncementBanner() {
    const [announcement, setAnnouncement] = useState(null)
    const [closed, setClosed] = useState(false)

    useEffect(() => {
        getAnnouncement()
            .then(data => setAnnouncement(data))
            .catch(() => {})   // no banner is fine
    }, [])

    // Nothing to show: no announcement, closed now, or closed before.
    // String(...) because localStorage only stores text: '7' vs 7.
    if (!announcement || closed || getClosedId() === String(announcement.id)) {
        return null
    }

    const style = BANNER_STYLES[announcement.style] ?? BANNER_STYLES.info

    // A link starting with "/" is a page on THIS site -> <Link> (no
    // reload). Anything else (https://...) -> a normal <a>.
    const isInternal = announcement.link_url.startsWith('/')

    function close() {
        rememberClosed(announcement.id)
        setClosed(true)
    }

    return (
        // role='status': screen readers read it out politely.
        <div role='status' className={`flex items-center gap-3 border-b px-4 py-2 text-sm ${style.classes}`}>
            <Megaphone className='hidden h-4 w-4 shrink-0 sm:block' />

            {/* flex-1 + text-center: the text sits in the middle. */}
            <p className='flex-1 text-center'>
                {announcement.message}
                {announcement.link_url && (
                    isInternal ? (
                        <Link to={announcement.link_url} className='ml-2 font-semibold underline'>
                            {announcement.link_label || 'Read more'}
                        </Link>
                    ) : (
                        <a href={announcement.link_url} target='_blank' rel='noopener noreferrer' className='ml-2 font-semibold underline'>
                            {announcement.link_label || 'Read more'}
                        </a>
                    )
                )}
            </p>

            <button type='button' onClick={close} aria-label='Close announcement' className='shrink-0 opacity-70 hover:opacity-100'>
                <X className='h-4 w-4' />
            </button>
        </div>
    )
}

export default AnnouncementBanner
