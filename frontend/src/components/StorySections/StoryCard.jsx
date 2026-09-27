import { Link } from 'react-router-dom'
import { mediaUrl } from '../../api/client'
import { ACCENTS } from '../../styles/accents'
import { pluralize } from '../../utils/format'
import MatureBadge from './MatureBadge'
import { useMatureBlur } from '../../hooks/useMatureBlur'


// ---------------------------------------------------------------
// A wide story card: picture on the left, text on the right.
// (On phones the picture goes on top instead.)
//
// Usage:
//   <StoryCard story={story} accent='yellow' />
//
// `story` is one object from the API:
//   { id, title, excerpt, cover_image, category, author, reading_time }
// ---------------------------------------------------------------
function StoryCard({ story, accent = 'red' }) {
    // 18+ story and not a confirmed adult: blur the cover.
    const blur = useMatureBlur(story)
    const colors = ACCENTS[accent]

    // "the_keeper" -> "TH" for the little round avatar.
    // .slice(0, 2) = the first two characters.
    const initials = story.author.slice(0, 2).toUpperCase()

    return (
        // shadow-lg + colors.glow = a soft coloured glow under the card.
        // overflow-hidden cuts the picture off at the rounded corners.
        <article className={`flex flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800 shadow-lg sm:flex-row ${colors.glow}`}>

            {/* ---------- PICTURE ---------- */}
            {/* relative = anchor for the fade overlay inside it. */}
            {/* overflow-hidden: the blurred 18+ cover is zoomed a little -
                keep it inside its box. */}
            <div className='relative h-48 shrink-0 overflow-hidden sm:h-auto sm:w-2/5'>
                {story.cover_image ? (
                    <img
                        src={mediaUrl(story.cover_image)}
                        alt=''
                        className={`h-full w-full object-cover ${blur}`}
                    />
                ) : (
                    // No picture uploaded - a dark gradient instead of
                    // an empty hole or a broken-image icon.
                    <div className='h-full w-full bg-linear-to-br from-slate-700 to-slate-900' />
                )}

                {/* The fade: see-through on the left, the card's own
                    colour (slate-800) on the right. Laid over the
                    picture, it makes the photo melt into the card.
                    hidden sm:block = only when the picture is on the
                    left side (not on phones). */}
                <div className='absolute inset-y-0 right-0 hidden w-1/2 bg-linear-to-r from-transparent to-slate-800 sm:block' />
                <MatureBadge story={story} />
            </div>

            {/* ---------- TEXT ---------- */}
            <div className='flex flex-col justify-center p-6'>
                {/* Only show the category if the story has one. */}
                {story.category && (
                    <p className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                        {story.category}
                    </p>
                )}

                <h3 className='mt-2 text-xl font-extrabold text-white'>{story.title}</h3>

                <p className='mt-2 text-sm text-gray-400'>{story.excerpt}</p>

                {/* Author + reading time + views */}
                <div className='mt-4 flex items-center gap-2 text-xs text-gray-400'>
                    <span className='flex h-6 w-6 items-center justify-center rounded-full bg-red-700 text-[10px] font-bold text-white'>
                        {initials}
                    </span>
                    <span className='text-gray-300'>{story.author}</span>
                    {/* &middot; = the little centred dot "·" */}
                    <span className='text-gray-600'>&middot;</span>
                    <span>{story.reading_time} min read</span>
                    <span className='text-gray-600'>&middot;</span>
                    <span>{pluralize(story.views, 'view', 'views')}</span>
                </div>

                {/* <Link> goes to the story page (StoryPage.jsx) without
                    reloading the whole app. */}
                <Link
                    to={`/stories/${story.id}`}
                    className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${colors.text} ${colors.hoverText}`}
                >
                    Read story
                    <svg className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24' aria-hidden='true'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 4.5l7.5 7.5-7.5 7.5' />
                    </svg>
                </Link>
            </div>
        </article>
    )
}

export default StoryCard
