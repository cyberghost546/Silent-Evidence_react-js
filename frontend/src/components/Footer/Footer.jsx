import { useState, useEffect } from 'react'
import { getCategories } from '../../api/client'
import { XIcon, RedditIcon, DiscordIcon } from '../BrandIcons/BrandIcons'


// ===============================================================
// THE SITE FOOTER
//
// Four columns on desktop, stacking to one column on a phone.
//
// Three of the columns are plain hardcoded links. The Categories
// column is different - it pulls live data from the Django API,
// the same endpoint the header dropdown uses.
// ===============================================================


// ---------------------------------------------------------------
// The link lists live OUTSIDE the component.
//
// Why? Anything declared inside a component is rebuilt from scratch
// on every single render. These arrays never change, so there is no
// reason to recreate them. Keeping them up here also means all the
// footer's content is in one obvious place to edit.
// ---------------------------------------------------------------
const NAVIGATE_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'Write a Story', href: '/write' },
    { label: 'Search', href: '/search' },
    { label: 'Site Guide', href: '/guide' },
    { label: 'Ask The Watcher', href: '/watcher' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
]

const ACCOUNT_LINKS = [
    { label: 'Log In', href: '/login' },
    { label: 'Sign Up', href: '/signup' },
    { label: 'Settings', href: '/settings' },
]

const LEGAL_LINKS = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Acceptable Use', href: '/acceptable-use' },
    { label: 'Copyright & Illegal Content', href: '/copyright' },
    { label: 'Cookie settings', href: '/cookies' },
]

// Shared styling for every footer link, written once. Change this
// line and all ~15 links update together.
const LINK_STYLE = 'text-gray-400 hover:text-white transition-colors'

// Same idea for the little uppercase column headings.
const HEADING_STYLE = 'text-xs font-bold uppercase tracking-wider text-gray-300 mb-4'


// ---------------------------------------------------------------
// A SMALL HELPER COMPONENT.
//
// All four columns are "a heading with a list of links underneath".
// Rather than copy that markup four times, we write it once here
// and use it four times below.
//
// A component defined in the same file is fine when it is only used
// by this file. If you ever need it elsewhere, move it to its own
// file and export it.
// ---------------------------------------------------------------
function FooterColumn({ title, links }) {
    return (
        <div>
            <h3 className={HEADING_STYLE}>{title}</h3>

            {/* space-y-3 puts a gap between children - simpler than
                adding a margin to every single <li>. */}
            <ul className='space-y-3 text-sm'>
                {links.map(link => (
                    // "key" is required on any list React renders.
                    <li key={link.href}>
                        <a href={link.href} className={LINK_STYLE}>
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    )
}


function Footer() {
    // The categories we fetch from Django. Starts as an empty array,
    // NOT null, because the first render happens before the data
    // arrives and we immediately call .map() on it.
    const [categories, setCategories] = useState([])

    useEffect(() => {
        getCategories()
            .then(data => setCategories(data))
            .catch(err => console.error('Could not load categories:', err))

        // The empty [] means "run once, after the first render".
        // Without it: fetch -> setState -> re-render -> fetch -> forever.
    }, [])

    // We have 52 categories but the footer only has room for a few.
    // .slice(0, 6) takes the first six without changing the original
    // array. Then we reshape { id, name, slug } into { label, href }
    // so FooterColumn can treat them like any other link list.
    const categoryLinks = categories.slice(0, 6).map(cat => ({
        label: cat.name,
        href: `/category/${cat.slug}`,
    }))

    // Never hardcode the year - it silently goes stale every January.
    const year = new Date().getFullYear()

    return (
        <footer className='bg-slate-900 text-gray-400 px-8 py-16'>

            {/* max-w-7xl + mx-auto centres the content on wide screens
                so the columns don't stretch across a huge monitor. */}
            <div className='max-w-7xl mx-auto'>

                {/* ---------- THE FOUR COLUMNS ---------- */}
                {/* Responsive grid, read left to right:
                      grid-cols-1     phones: one column, stacked
                      md:grid-cols-2  tablets: two columns
                      lg:grid-cols-4  desktop: four across

                    Tailwind is mobile-first: the plain class is the
                    small-screen default, and md:/lg: override it as
                    the screen gets wider. */}
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>

                    {/* --- Column 1: brand --- */}
                    <div>
                        <h2 className='text-xl font-bold text-red-600 mb-4'>
                            Silent Evidence
                        </h2>

                        {/* max-w-xs stops the paragraph running too wide.
                            Long lines are genuinely harder to read. */}
                        <p className='text-sm leading-relaxed max-w-xs mb-6'>
                            A community for horror story readers and writers.
                            Share your story with the world.
                        </p>

                        {/* Social icons. Each is an <a> wrapping a logo from
                            BrandIcons.jsx (shared with the story Share menu).
                            An icon has no text, so a screen reader would
                            announce nothing - aria-label supplies the name. */}
                        <div className='flex gap-4'>
                            <a href='https://x.com' aria-label='X (Twitter)' className={LINK_STYLE}>
                                <XIcon />
                            </a>

                            <a href='https://reddit.com' aria-label='Reddit' className={LINK_STYLE}>
                                <RedditIcon />
                            </a>

                            <a href='https://discord.com' aria-label='Discord' className={LINK_STYLE}>
                                <DiscordIcon />
                            </a>
                        </div>
                    </div>

                    {/* --- Column 2: navigate --- */}
                    <FooterColumn title='Navigate' links={NAVIGATE_LINKS} />

                    {/* --- Column 3: categories (live from the API) --- */}
                    {/* Same component as the others. It doesn't care that
                        this list came from a database. */}
                    <FooterColumn title='Categories' links={categoryLinks} />

                    {/* --- Column 4: account AND legal stacked --- */}
                    <div className='space-y-8'>
                        <FooterColumn title='Account' links={ACCOUNT_LINKS} />
                        <FooterColumn title='Legal' links={LEGAL_LINKS} />
                    </div>
                </div>

                {/* ---------- THE BOTTOM BAR ---------- */}
                {/* border-t draws the divider line above it. */}
                <div className='border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between gap-4 text-sm'>
                    <p>{year} Silent Evidence. All rights reserved.</p>

                    <p>
                        Made with <span className='text-red-600'>&#9829;</span> for horror fans everywhere.
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
