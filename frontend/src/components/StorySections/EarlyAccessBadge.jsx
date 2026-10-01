import { Crown } from 'lucide-react'


// ---------------------------------------------------------------
// The gold "PRO EARLY" label on story cards - for a story that only
// Pro readers can read for now (Story.early_access_until in Django).
//
//   <EarlyAccessBadge story={story} />
//
// Same idea as MatureBadge: put it inside the picture's box (which
// has `relative`). Bottom-right, because the top corners already
// have the 18+ and "Choose your path" labels.
//
// Once the time has passed it draws nothing - the story is open to
// everyone by then.
// ---------------------------------------------------------------
function EarlyAccessBadge({ story }) {
    if (!story.early_access_until || new Date(story.early_access_until) <= new Date()) return null
    return (
        <span
            className='absolute bottom-3 right-3 inline-flex items-center gap-1 rounded bg-yellow-400 px-1.5 py-0.5 text-[11px] font-extrabold text-black shadow'
            title='Pro readers can read it now - everyone else soon'
        >
            <Crown className='h-3 w-3' aria-hidden='true' />
            PRO EARLY
        </span>
    )
}

export default EarlyAccessBadge
