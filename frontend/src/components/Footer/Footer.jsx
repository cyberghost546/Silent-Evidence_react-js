import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { getCategories } from '../../api/client'
import InstallAppButton from '../InstallAppButton/InstallAppButton'
import { XIcon, RedditIcon, DiscordIcon } from '../BrandIcons/BrandIcons'
import { openWatcher } from '../SiteGuide/openWatcher'


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
    // onClick instead of a page: opens the pop-up chat (openWatcher.js).
    { label: 'Ask The Watcher', onClick: openWatcher },
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
//
// PHONE vs DESKTOP:
// On a phone, 25+ links in one long stack is a lot of scrolling, so
// each column folds up like an accordion - tap the heading to open
// it. From md: (tablet) upward there is room for everything, so the
// heading is plain text and the list is always visible.
//
// We do this with ONE list and Tailwind classes, not two copies:
//   - the phone heading is a <button>  (md:hidden hides it on desktop)
//   - the desktop heading is an <h3>   (hidden md:block = desktop only)
//   - the list is "hidden" on a phone until opened, but md:block
//     forces it visible on desktop no matter what "open" says.
// ---------------------------------------------------------------
function FooterColumn({ title, links }) {
    // Only matters on a phone. Every column starts closed.
    const [open, setOpen] = useState(false)

    return (
        // On a phone each column gets a thin divider line under it,
        // which makes the accordion rows easy to tell apart.
        // md:border-0 removes it again on desktop.
        <div className='border-b border-slate-800 md:border-0'>

            {/* Phone heading: a full-width button. py-4 makes it a
                comfortable thumb-sized tap target.
                aria-expanded tells screen readers if it's open. */}
            <button
                type='button'
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className='md:hidden w-full flex items-center justify-between py-4 text-xs font-bold uppercase tracking-wider text-gray-300'
            >
                {title}
                {/* The arrow flips upside down when open. */}
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Desktop heading: the same text, just not clickable. */}
            <h3 className={`hidden md:block ${HEADING_STYLE}`}>{title}</h3>

            {/* space-y-3 puts a gap between children - simpler than
                adding a margin to every single <li>.
                pb-4 gives the open list some room above the divider. */}
            <ul className={`${open ? 'block' : 'hidden'} md:block space-y-3 text-sm pb-4 md:pb-0`}>
                {links.map(link => (
                    // "key" is required on any list React renders.
                    <li key={link.label}>
                        {/* A link with onClick opens a pop-up instead of a page. */}
                        {link.onClick ? (
                            <button type='button' onClick={link.onClick} className={LINK_STYLE}>
                                {link.label}
                            </button>
                        ) : (
                            <a href={link.href} className={LINK_STYLE}>
                                {link.label}
                            </a>
                        )}
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
        // Less padding on a phone (px-5 py-10) so the screen isn't
        // half empty space; the full px-8 py-16 kicks in at md:.
        //
        // The bottom padding also adds --tabbar-space (index.css):
        // room for the phone tab bar, so it never covers the last
        // line. It's 0 on big screens, where there's no tab bar.
        <footer className='bg-slate-900 text-gray-400 px-5 pt-10 pb-[calc(2.5rem+var(--tabbar-space))] md:px-8 md:pt-16 md:pb-[calc(4rem+var(--tabbar-space))]'>

            {/* max-w-7xl + mx-auto centres the content on wide screens
                so the columns don't stretch across a huge monitor. */}
            <div className='max-w-7xl mx-auto'>

                {/* ---------- THE FOUR COLUMNS ---------- */}
                {/* Responsive grid, read left to right:
                      grid-cols-1     phones: one column, stacked
                      md:grid-cols-2  tablets: two columns
                      lg:grid-cols-4  desktop: four across

                    gap-0 on a phone because the accordion rows sit
                    right on top of each other, divided by lines.

                    Tailwind is mobile-first: the plain class is the
                    small-screen default, and md:/lg: override it as
                    the screen gets wider. */}
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 md:gap-8'>

                    {/* --- Column 1: brand --- */}
                    {/* Phone: centred, with a divider line under it so the
                        accordion rows below have a line on top too.
                        md: puts it back to left-aligned with no line. */}
                    <div className='text-center md:text-left pb-6 md:pb-0 border-b border-slate-800 md:border-0'>
                        <h2 className='text-xl font-bold text-red-600 mb-4'>
                            Silent Evidence
                        </h2>

                        {/* max-w-xs stops the paragraph running too wide.
                            Long lines are genuinely harder to read. */}
                        <p className='text-sm leading-relaxed max-w-xs mx-auto md:mx-0 mb-6'>
                            A community for horror story readers and writers.
                            Share your story with the world.
                        </p>

                        {/* Social icons. Each is an <a> wrapping a logo from
                            BrandIcons.jsx (shared with the story Share menu).
                            An icon has no text, so a screen reader would
                            announce nothing - aria-label supplies the name. */}
                        <div className='flex gap-6 md:gap-4 justify-center md:justify-start'>
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
                    {/* md:space-y-8 only - on a phone they are just two
                        more accordion rows, so no extra gap. */}
                    <div className='md:space-y-8'>
                        <FooterColumn title='Account' links={ACCOUNT_LINKS} />
                        <FooterColumn title='Legal' links={LEGAL_LINKS} />
                    </div>
                </div>

                {/* ---------- THE BOTTOM BAR ---------- */}
                {/* On a phone the accordions already end with a line,
                    so no border-t here - just centred, stacked text.
                    From sm: up it goes back to one row, left to right. */}
                <div className='mt-8 md:mt-12 md:border-t md:border-slate-800 md:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-center sm:text-left'>
                    <p>{year} Silent Evidence. All rights reserved.</p>

                    {/* Only shows where installing is possible (InstallAppButton.jsx). */}
                    <InstallAppButton />

                    <p>
                        Made with <span className='text-red-600'>&#9829;</span> for horror fans everywhere.
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
