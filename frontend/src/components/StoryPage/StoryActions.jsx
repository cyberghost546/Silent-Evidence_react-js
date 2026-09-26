import { useState } from 'react'
import { Bookmark, BookmarkCheck, Link as LinkIcon, Check, MessageCircle, ChevronDown, Flag } from 'lucide-react'
import { useDropdown } from '../../hooks/useDropdown'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import { saveStory } from '../../api/client'
import { XIcon, RedditIcon } from '../BrandIcons/BrandIcons'
import ReportDialog from '../ReportDialog/ReportDialog'


const ITEM_BASE = 'flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-gray-800'
const ITEM_STYLE = `${ITEM_BASE} text-gray-200 hover:text-white`


// ---------------------------------------------------------------
// The "Actions" dropdown on a story: Save, Copy link, Share.
//
// Usage:
//   <StoryActions story={story} />
//
// `story` needs: id, title, saved (true if YOU saved it already)
//
// Put key={story.id} on it (StoryPage does): when you move to
// another story, the key changes and React starts a fresh
// StoryActions - otherwise "Saved" from the old story would stick.
// ---------------------------------------------------------------
function StoryActions({ story }) {
    const { open, toggle, close, ref } = useDropdown()
    const requireLogin = useRequireLogin()

    // Starts from what Django said, then changes when you click.
    const [saved, setSaved] = useState(story.saved)
    const [copied, setCopied] = useState(false)

    // Is the Report pop-up open?
    const [reporting, setReporting] = useState(false)

    function handleReport() {
        close()
        if (!requireLogin()) return   // logged out -> Log In page first
        setReporting(true)
    }

    // The address to share. window.location.origin = "http://localhost:5173"
    // now, and your real domain once the site is online.
    const storyUrl = `${window.location.origin}/stories/${story.id}`

    // Share links are just URLs the big sites understand. Anything we
    // put in a URL must be encoded first: encodeURIComponent turns
    // spaces into %20, & into %26 and so on, so a title like
    // "Rock & Roll" can't break the link.
    const url = encodeURIComponent(storyUrl)
    const text = encodeURIComponent(story.title)
    const shareLinks = [
        { label: 'Share on X', icon: <XIcon className='h-4 w-4' />, href: `https://twitter.com/intent/tweet?text=${text}&url=${url}` },
        { label: 'Share on WhatsApp', icon: <MessageCircle className='h-4 w-4' />, href: `https://wa.me/?text=${text}%20${url}` },
        { label: 'Share on Reddit', icon: <RedditIcon className='h-4 w-4' />, href: `https://www.reddit.com/submit?url=${url}&title=${text}` },
    ]

    async function handleSave() {
        if (!requireLogin()) return
        try {
            const data = await saveStory(story.id)
            setSaved(data.saved)
        } catch (err) {
            console.error('Could not save story:', err)
        }
    }

    async function handleCopy() {
        try {
            // The Clipboard API - the same as the user pressing Ctrl+C.
            // It's async (returns a Promise), hence the await.
            await navigator.clipboard.writeText(storyUrl)
            setCopied(true)
            // Switch the label back after 2 seconds.
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            // Some browsers block the clipboard (e.g. over plain http
            // on a real domain). Not worth an error message.
            console.error('Could not copy link:', err)
        }
    }

    return (
        <div className='relative' ref={ref}>
            <button
                type='button'
                onClick={toggle}
                aria-haspopup='menu'
                aria-expanded={open}
                className='inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:border-gray-500 hover:text-white'
            >
                Actions
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div role='menu' className='absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-gray-700/60 bg-gray-900 py-2 shadow-2xl'>
                    {/* Save: the icon and the word both depend on `saved`. */}
                    <button type='button' role='menuitem' onClick={handleSave} className={ITEM_STYLE}>
                        {saved ? <BookmarkCheck className='h-4 w-4 text-red-500' /> : <Bookmark className='h-4 w-4' />}
                        {saved ? 'Saved' : 'Save'}
                    </button>

                    <div className='my-2 border-t border-gray-800' />

                    <button type='button' role='menuitem' onClick={handleCopy} className={ITEM_STYLE}>
                        {copied ? <Check className='h-4 w-4 text-green-400' /> : <LinkIcon className='h-4 w-4' />}
                        {copied ? 'Link copied!' : 'Copy link'}
                    </button>

                    {/* target='_blank' = open in a new tab.
                        rel='noopener noreferrer' = the new tab can't
                        reach back and control our page - always add it
                        when linking to another site with _blank. */}
                    {shareLinks.map(link => (
                        <a
                            key={link.label}
                            href={link.href}
                            target='_blank'
                            rel='noopener noreferrer'
                            role='menuitem'
                            onClick={close}
                            className={ITEM_STYLE}
                        >
                            {link.icon}
                            {link.label}
                        </a>
                    ))}

                    <div className='my-2 border-t border-gray-800' />

                    {/* Report - red, and last, so nobody clicks it by accident. */}
                    <button type='button' role='menuitem' onClick={handleReport} className={`${ITEM_BASE} text-red-400 hover:text-red-300`}>
                        <Flag className='h-4 w-4' />
                        Report story
                    </button>
                </div>
            )}

            {reporting && (
                <ReportDialog target={{ story_id: story.id }} what='story' onClose={() => setReporting(false)} />
            )}
        </div>
    )
}

export default StoryActions
