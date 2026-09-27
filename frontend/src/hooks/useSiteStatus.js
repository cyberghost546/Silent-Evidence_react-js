import { useState, useEffect } from 'react'
import { getSiteStatus } from '../api/client'


// ---------------------------------------------------------------
// useSiteStatus() -> the site-wide switches from the dashboard
// (Site Settings + SEO), or null while loading / if Django is down:
//
//   { maintenance_mode, maintenance_message, signups_open,
//     contact_email, site_title, site_description }
//
// Usage:
//   const site = useSiteStatus()
//   if (site && !site.signups_open) return <p>Closed</p>
//
// Many components use it (the maintenance screen, every page title,
// Sign Up, Contact), so Django is asked only ONCE per page load:
// the first call saves its request in `request` below, and every
// later call reuses it. (Changes in the dashboard show after a reload.)
// ---------------------------------------------------------------
let request = null

function loadOnce() {
    if (request === null) {
        // .catch(() => null): no status = act like everything is normal.
        request = getSiteStatus().catch(() => null)
    }
    return request
}


export function useSiteStatus() {
    const [site, setSite] = useState(null)

    useEffect(() => {
        let ignore = false
        loadOnce().then(data => {
            if (!ignore) setSite(data)
        })
        return () => {
            ignore = true
        }
    }, [])

    return site
}
