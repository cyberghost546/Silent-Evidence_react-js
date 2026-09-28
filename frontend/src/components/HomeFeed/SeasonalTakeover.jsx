import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { getStories } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { getCurrentSeason, getSeasonByKey } from '../../utils/horrorDays'
import StoryGridCard from '../StorySections/StoryGridCard'


// ---------------------------------------------------------------
// SEASONAL BANNER on the homepage - Halloween week, Friday the 13th,
// Krampusnacht... (the days + words are in utils/horrorDays.js).
//
// Shows by itself when a season is on, with up to 4 stories tagged
// for it (e.g. tag "halloween"). No tagged stories yet -> the
// scariest ones instead.
//
// Preview any season, any day:  /?season=halloween
//
// The X hides it - remembered for THAT season in THAT year, so next
// Halloween it comes back.
// ---------------------------------------------------------------
function dismissKey(season) {
    return `seasonDismissed:${season.key}:${season.date.getFullYear()}`
}

function isDismissed(season) {
    try {
        return localStorage.getItem(dismissKey(season)) === 'yes'
    } catch {
        return false
    }
}

async function loadSeasonStories(season) {
    const tagged = await getStories({ tag: season.season.tag, sort: 'popular', limit: 4 })
    if (tagged.length > 0) return tagged
    return getStories({ sort: 'scariest', limit: 4 })
}

// "in 3 days" / "tomorrow" / "tonight"
function whenLabel(daysLeft) {
    if (daysLeft === 0) return 'Tonight'
    if (daysLeft === 1) return 'Tomorrow'
    return `In ${daysLeft} days`
}

function SeasonalTakeover() {
    const [searchParams] = useSearchParams()
    const preview = searchParams.get('season')
    const season = preview ? getSeasonByKey(preview) : getCurrentSeason()

    // The preview always shows, even if you closed it before.
    const [hidden, setHidden] = useState(() => (season && !preview ? isDismissed(season) : false))
    const { data: stories } = useApi(() => (season ? loadSeasonStories(season) : Promise.resolve([])), [season?.key])

    if (!season || hidden) return null

    function dismiss() {
        try {
            localStorage.setItem(dismissKey(season), 'yes')
        } catch {
            // Can't remember it - it just hides for now.
        }
        setHidden(true)
    }

    const Icon = season.icon

    return (
        <section className='relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-orange-900/60 bg-slate-950 p-6 sm:p-10'>
            {/* An orange glow, like a jack-o'-lantern in the dark. */}
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(234,88,12,0.25),transparent_65%)]' />

            <button
                type='button'
                onClick={dismiss}
                aria-label='Hide this banner'
                className='absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-slate-800 hover:text-white'
            >
                <X className='h-5 w-5' />
            </button>

            <div className='relative'>
                <p className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-400'>
                    <Icon className='h-4 w-4' />
                    {whenLabel(season.daysLeft)}
                </p>
                <h2 className='mt-3 text-3xl font-bold text-white sm:text-4xl'>{season.season.headline}</h2>
                <p className='mt-2 max-w-2xl text-gray-300'>{season.season.text}</p>

                {stories?.length > 0 && (
                    <div className='mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
                        {stories.map(story => <StoryGridCard key={story.id} story={story} />)}
                    </div>
                )}
            </div>
        </section>
    )
}

export default SeasonalTakeover
