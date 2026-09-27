import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { getSpotlight, mediaUrl } from '../../api/client'


// ---------------------------------------------------------------
// STORY SPOTLIGHT on the homepage: one big banner for one story,
// with the admins' own headline and blurb.
//
// Admins plan it on Admin Dashboard -> Story Spotlight (a start and
// end date). No spotlight today = nothing is shown.
// ---------------------------------------------------------------
function SpotlightBanner() {
    const [spotlight, setSpotlight] = useState(null)

    useEffect(() => {
        getSpotlight()
            .then(data => setSpotlight(data))
            .catch(() => {})
    }, [])

    if (!spotlight) return null

    const story = spotlight.story
    // The story's cover picture, if it has one.
    const image = story.cover_image ? mediaUrl(story.cover_image) : ''

    return (
        <section className='mx-auto max-w-6xl'>
            <Link
                to={`/stories/${story.id}`}
                className='group relative block overflow-hidden rounded-3xl border border-red-900/60 bg-slate-950'
            >
                {/* The picture fills the banner, darkened so the text
                    stays readable. No picture: a red glow instead. */}
                {image ? (
                    <img src={image} alt='' className='absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-105' />
                ) : (
                    <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(185,28,28,0.45),transparent_60%)]' />
                )}
                {/* A dark gradient from the left, behind the text. */}
                <div className='absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent' />

                <div className='relative max-w-2xl p-8 sm:p-12'>
                    <p className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-400'>
                        <Sparkles className='h-4 w-4' />
                        Spotlight
                    </p>
                    <h2 className='mt-3 text-3xl font-bold text-white sm:text-4xl'>{spotlight.headline}</h2>
                    {spotlight.blurb && <p className='mt-3 text-gray-300'>{spotlight.blurb}</p>}
                    <p className='mt-5 text-sm text-gray-400'>
                        <span className='font-semibold text-white'>{story.title}</span> by {story.author} · {story.reading_time} min read
                    </p>
                    <span className='mt-5 inline-block rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-red-500'>
                        Read the story
                    </span>
                </div>
            </Link>
        </section>
    )
}

export default SpotlightBanner
