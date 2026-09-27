import { useState, useEffect } from 'react'
import { getSiteStatus } from '../api/client'


// ---------------------------------------------------------------
// useSiteStatus() -> the site-wide switches from Dashboard -> Site
// Settings, or null while loading (or if Django can't be reached):
//
//   { maintenance_mode, maintenance_message, signups_open, contact_email }
//
// Usage:
//   const site = useSiteStatus()
//   if (site && !site.signups_open) return <p>Closed</p>
//
// It's a custom hook: a function whose name starts with "use" and
// that calls other hooks. Any component can call it.
// ---------------------------------------------------------------
export function useSiteStatus() {
    const [site, setSite] = useState(null)

    useEffect(() => {
        let ignore = false
        getSiteStatus()
            .then(data => {
                if (!ignore) setSite(data)
            })
            .catch(() => {})   // no status = act like everything is normal
        return () => {
            ignore = true
        }
    }, [])

    return site
}
