import { Link } from 'react-router-dom'
import { Eye, Skull } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { formatShortDate } from '../../utils/format'
import MatureBadge from './MatureBadge'
import { useMatureBlur } from '../../hooks/useMatureBlur'


// ---------------------------------------------------------------
// A TALL story card, for grids: picture on top, text underneath.
// (StoryCard.jsx in this folder is the WIDE one - picture on the
// left. Both take the same `story` object, so a page can switch
// between them - see the grid/list toggle on CategoryPage.)
//
// Usage:
//   <StoryGridCard story={story} />
//
// `story` comes from /api/stories/:
//   { id, title, excerpt, cover_image, category, author,
//     reading_time, created_at }
// ---------------------------------------------------------------
function StoryGridCard({ story }) {
    // 18+ story and not a confirmed adult: blur the cover.
    const blur = useMatureBlur(story)
    const initials = story.author.slice(0, 2).toUpperCase()

    return (
        // The whole card is one link to the story page (StoryPage.jsx).
        // flex flex-col + h-full: every card in a grid row is as tall
        // as the tallest one, even with a short excerpt.
        <Link
            to={`/stories/${story.id}`}
            className='flex h-full flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800 transition hover:-translate-y-0.5 hover:border-slate-500'
        >
            {/* ---------- PICTURE ---------- */}
            {/* overflow-hidden: the blurred 18+ cover is zoomed a little -
                keep it inside its box. */}
            <div className='relative h-48 overflow-hidden'>
                {story.cover_image ? (
                    <img src={mediaUrl(story.cover_image)} alt='' className={`h-full w-full object-cover ${blur}`} />
                ) : (
                    <div className='h-full w-full bg-linear-to-br from-slate-700 to-slate-900' />
                )}

                {/* A dark fade at the bottom of the picture, so the
                    "1 min read" label stays readable on bright photos. */}
                <div className='absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/60 to-transparent' />

                <span className='absolute bottom-3 left-3 rounded bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white'>
                    {story.reading_time} min read
                </span>
                <MatureBadge story={story} />
            </div>

            {/* ---------- TEXT ---------- */}
            {/* flex-1 makes this part stretch, so the author row below
                always sits at the very bottom of the card. */}
            <div className='flex flex-1 flex-col p-5'>
                {story.category && (
                    <p className='text-xs font-bold uppercase tracking-wider text-red-500'>{story.category}</p>
                )}

                <h3 className='mt-2 text-lg font-bold text-white'>{story.title}</h3>

                {/* line-clamp-2 = at most 2 lines, then "..." */}
                <p className='mt-2 mb-4 line-clamp-2 text-sm text-gray-400'>{story.excerpt}</p>

                {/* mt-auto pushes this row down to the bottom. */}
                <div className='mt-auto flex items-center gap-2 border-t border-slate-700 pt-4 text-xs'>
                    <span className='flex h-6 w-6 items-center justify-center rounded-full bg-red-700 text-[10px] font-bold text-white'>
                        {initials}
                    </span>
                    <span className='text-gray-300'>{story.author}</span>

                    {/* ml-auto pushes the fear, views + date to the right.
                        Fear only once someone rated it (null = not yet). */}
                    {story.fear_average !== null && story.fear_average !== undefined && (
                        <span className='ml-auto inline-flex items-center gap-1 text-red-400' title='Fear meter (out of 5)'>
                            <Skull className='h-3.5 w-3.5' /> {story.fear_average}
                        </span>
                    )}
                    <span className={`${story.fear_average ? '' : 'ml-auto '}inline-flex items-center gap-1 text-gray-500`} title='Views'>
                        <Eye className='h-3.5 w-3.5' /> {story.views}
                    </span>
                    <span className='text-gray-500'>{formatShortDate(story.created_at)}</span>
                </div>
            </div>
        </Link>
    )
}

export default StoryGridCard
