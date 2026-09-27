import { useEffect } from 'react'
import { useSiteStatus } from './useSiteStatus'


// ---------------------------------------------------------------
// usePageTitle('The House on Wren Street')
//   -> browser tab: "The House on Wren Street · Silent Evidence"
// usePageTitle()  (no title, e.g. the homepage)
//   -> browser tab: "Silent Evidence"
//
// The site name and the description come from Dashboard -> SEO.
// The description goes in <meta name="description"> - the text a
// search engine may show under the link.
//
// Call it at the top of a page component, like any hook.
// ---------------------------------------------------------------
export function usePageTitle(title) {
    const site = useSiteStatus()
    const siteTitle = site?.site_title || 'Silent Evidence'
    const description = site?.site_description

    useEffect(() => {
        document.title = title ? `${title} · ${siteTitle}` : siteTitle
    }, [title, siteTitle])

    useEffect(() => {
        if (!description) return
        const meta = document.querySelector('meta[name="description"]')
        if (meta) meta.setAttribute('content', description)
    }, [description])
}
