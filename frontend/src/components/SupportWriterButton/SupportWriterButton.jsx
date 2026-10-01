import { HeartHandshake } from 'lucide-react'


// ---------------------------------------------------------------
// "Support the writer" - a link to the writer's own tipping page
// (Ko-fi, PayPal.me...), set in Settings -> Profile -> Support link.
//
// Usage:
//   <SupportWriterButton url={story.author_tip_url} name={story.author} />
//
// No url -> draws nothing. Django only accepts links to known
// tipping sites (TIP_SITES in accounts/models.py).
// ---------------------------------------------------------------
function SupportWriterButton({ url, name }) {
    if (!url) return null

    return (
        // target='_blank' + rel='noopener noreferrer': a new tab that
        // can't reach back into ours (always together).
        <a
            href={url}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-lg border border-amber-700/70 bg-amber-950/30 px-3 py-1.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-900/40'
        >
            <HeartHandshake className='h-4 w-4' />
            Support {name}
        </a>
    )
}

export default SupportWriterButton
