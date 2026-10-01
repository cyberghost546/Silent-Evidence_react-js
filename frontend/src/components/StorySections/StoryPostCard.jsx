import { Link } from 'react-router-dom'
import { Eye, Skull, Clock, Share2 } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { timeAgo } from '../../utils/format'
import MatureBadge from './MatureBadge'
import EarlyAccessBadge from './EarlyAccessBadge'
import PathBadge from './PathBadge'
import { useMatureBlur } from '../../hooks/useMatureBlur'


// ---------------------------------------------------------------
// A story as a SOCIAL MEDIA POST - the phone version of a story card.
//
//   ┌──────────────────────────────────────┐
//   │ (CH) christopher · 2h      [Creepy] │  <- who posted it
//   │ ┌──────────────────────────────────┐ │
//   │ │            the cover             │ │
//   │ └──────────────────────────────────┘ │
//   │ The title                            │
//   │ The first two lines of the story...  │
//   │ 👁 120   💀 4.2   ⏱ 5 min      [⤴]  │  <- the action row
//   └──────────────────────────────────────┘
//
// Usage:
//   <StoryPostCard story={story} />
//
// It takes the same `story` object as StoryGridCard and StoryCard
// (from /api/stories/), so a list can use any of the three.
//
// Unlike StoryGridCard, the whole card is NOT one big link: the
// author's name links to their profile, and a link inside a link
// isn't allowed in HTML. So the picture and the title are the links
// to the story instead.
// ---------------------------------------------------------------
function StoryPostCard({ story }) {
    // 18+ story and not a confirmed adult: blur the cover.
    const blur = useMatureBlur(story)
    const initials = story.author.slice(0, 2).toUpperCase()
    const storyUrl = `/stories/${story.id}`

    // The phone's own share sheet (WhatsApp, Messages, copy link...).
    // navigator.share only exists on phones and some browsers - where
    // it doesn't, we copy the link instead.
    async function handleShare() {
        // window.location.origin = "https://your-site.com", so the
        // shared link works outside the app too.
        const url = window.location.origin + storyUrl
        try {
            if (navigator.share) {
                await navigator.share({ title: story.title, url })
            } else {
                await navigator.clipboard.writeText(url)
                alert('Link copied!')
            }
        } catch {
            // Pressing "cancel" on the share sheet lands here - fine.
        }
    }

    return (
        // <article> = a self-contained piece of content (like a post).
        <article className='overflow-hidden rounded-3xl border border-white/5 bg-slate-900'>

            {/* ---------- WHO POSTED IT ---------- */}
            <div className='flex items-center gap-3 px-4 pt-4 pb-3'>
                <Link to={`/profile/${story.author}`} className='flex min-w-0 items-center gap-3'>
                    <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white ring-2 ring-red-900'>
                        {initials}
                    </span>

                    {/* min-w-0 + truncate: a very long name ends in "..." */}
                    <span className='min-w-0'>
                        <span className='block truncate text-sm font-semibold text-white'>{story.author}</span>
                        {/* timeAgo = "2 hours ago" (utils/format.js) */}
                        <span className='block text-xs text-gray-500'>{timeAgo(story.created_at)}</span>
                    </span>
                </Link>

                {/* ml-auto pushes the category to the right. */}
                {story.category && (
                    <span className='ml-auto shrink-0 rounded-full bg-red-600/15 px-3 py-1 text-[11px] font-semibold text-red-400'>
                        {story.category}
                    </span>
                )}
            </div>

            {/* ---------- THE PICTURE ---------- */}
            {/* mx-3 + rounded-2xl = the picture sits INSIDE the card with
                its own round corners, like in phone apps.
                aspect-[4/3] = always 4 wide by 3 high, whatever the photo.
                No cover? No picture box at all - a text post. */}
            {story.cover_image && (
                <Link to={storyUrl} className='relative mx-3 block aspect-[4/3] overflow-hidden rounded-2xl'>
                    {/* loading='lazy' = only download it when you scroll
                        near it. A feed has lots of pictures. */}
                    <img src={mediaUrl(story.cover_image)} alt='' loading='lazy' className={`h-full w-full object-cover ${blur}`} />
                    <MatureBadge story={story} />
                    <EarlyAccessBadge story={story} />
                    <PathBadge story={story} />
                </Link>
            )}

            {/* ---------- THE TEXT ---------- */}
            <div className='px-4 pt-3'>
                <Link to={storyUrl} className='block text-lg font-bold leading-snug text-white hover:text-red-400'>
                    {story.title}
                </Link>
                {/* line-clamp-2 = at most 2 lines, then "..." */}
                <p className='mt-1 line-clamp-2 text-sm text-gray-400'>{story.excerpt}</p>
            </div>

            {/* ---------- THE ACTION ROW ---------- */}
            <div className='mt-3 flex items-center gap-4 border-t border-white/5 px-4 py-3 text-sm text-gray-400'>
                <span className='inline-flex items-center gap-1.5' title='Views'>
                    <Eye className='h-4 w-4' /> {story.views}
                </span>

                {/* Fear only once someone rated it (null = not yet). */}
                {story.fear_average !== null && story.fear_average !== undefined && (
                    <span className='inline-flex items-center gap-1.5 text-red-400' title='Fear meter (out of 5)'>
                        <Skull className='h-4 w-4' /> {story.fear_average}
                    </span>
                )}

                <span className='inline-flex items-center gap-1.5' title='Reading time'>
                    <Clock className='h-4 w-4' /> {story.reading_time} min
                </span>

                <button
                    type='button'
                    onClick={handleShare}
                    aria-label={`Share ${story.title}`}
                    className='ml-auto flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white'
                >
                    <Share2 className='h-4.5 w-4.5' />
                </button>
            </div>
        </article>
    )
}

export default StoryPostCard
