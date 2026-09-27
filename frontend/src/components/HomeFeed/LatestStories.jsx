import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getStories } from '../../api/client'
import { MOODS } from '../WriteStory/storyOptions'
import StoryGridCard from '../StorySections/StoryGridCard'
import SectionHeading from '../StorySections/SectionHeading'
import EmptyState from '../StorySections/EmptyState'
import '../NavDropdown/NavDropdown.css'


// The chips: "All" first, then the same moods writers pick on the
// Write a Story page (storyOptions.js) - one list, used in both places.
const MOOD_CHIPS = [{ value: 'all', label: 'All' }, ...MOODS]

// How far one click on an arrow scrolls the chip row, in pixels.
const SCROLL_STEP = 200


// ---------------------------------------------------------------
// "LATEST STORIES" - newest stories in a grid, with mood chips to
// filter them.
//
// Usage:
//   <LatestStories />             -> 12 stories
//   <LatestStories limit={6} />   -> 6 stories
// ---------------------------------------------------------------
function LatestStories({ limit = 12 }) {
    const [mood, setMood] = useState('all')

    // null = loading. Then a list (maybe empty).
    const [stories, setStories] = useState(null)

    // A handle on the chip row, so the arrow buttons can scroll it.
    const chipRowRef = useRef(null)

    // Runs again every time a different chip is picked.
    useEffect(() => {
        // Only send ?mood= when a mood is picked. 'all' = no filter.
        const filters = { limit }
        if (mood !== 'all') filters.mood = mood

        // `ignore` fixes a sneaky bug: click Creepy then Sad quickly,
        // and the Creepy answer might arrive LAST and overwrite Sad.
        // The cleanup sets ignore = true on the old request, so its
        // answer is thrown away.
        let ignore = false

        getStories(filters)
            .then(data => { if (!ignore) setStories(data) })
            .catch(() => { if (!ignore) setStories([]) })

        return () => { ignore = true }
    }, [mood, limit])

    function pickMood(value) {
        setStories(null)    // show "Loading..." while the new list comes
        setMood(value)
    }

    // scrollBy = "move the scroll position this far". Negative = left.
    // behavior: 'smooth' animates it instead of jumping.
    function scrollChips(direction) {
        chipRowRef.current.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' })
    }

    // The label of the picked mood, for the "nothing found" message.
    const moodLabel = MOOD_CHIPS.find(chip => chip.value === mood).label

    return (
        <section>
            <div className='flex items-center justify-between'>
                <SectionHeading title='Latest Stories' accent='red' />
                <Link to='/explore/latest' className='mb-4 text-sm text-gray-400 hover:text-white'>View all →</Link>
            </div>

            {/* ---------- MOOD CHIPS ---------- */}
            <div className='mb-6 flex items-center gap-2'>
                <button type='button' onClick={() => scrollChips(-1)} aria-label='Scroll moods left' className='shrink-0 text-red-500 hover:text-red-400'>
                    <ChevronLeft className='h-5 w-5' />
                </button>

                {/* min-w-0 lets this row get narrower than its chips,
                    so overflow-x-auto can kick in and scroll. */}
                <div ref={chipRowRef} className='dropdown-scroll flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2'>
                    {MOOD_CHIPS.map(chip => {
                        const isSelected = chip.value === mood
                        return (
                            <button
                                key={chip.value}
                                type='button'
                                onClick={() => pickMood(chip.value)}
                                aria-pressed={isSelected}
                                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    isSelected
                                        ? 'border-red-600 bg-red-600 text-white'
                                        : 'border-slate-600 text-gray-300 hover:border-slate-400 hover:text-white'
                                }`}
                            >
                                {chip.label}
                            </button>
                        )
                    })}
                </div>

                <button type='button' onClick={() => scrollChips(1)} aria-label='Scroll moods right' className='shrink-0 text-red-500 hover:text-red-400'>
                    <ChevronRight className='h-5 w-5' />
                </button>
            </div>

            {/* ---------- THE STORIES ---------- */}
            {stories === null && <p className='py-12 text-center text-sm text-gray-500'>Loading stories...</p>}

            {stories !== null && stories.length === 0 && (
                <EmptyState
                    title={mood === 'all' ? 'No stories yet' : `No ${moodLabel.toLowerCase()} stories yet`}
                    message='Be the first - write one from the menu under your avatar.'
                />
            )}

            {stories !== null && stories.length > 0 && (
                // 1 column on phones, 2 on tablets, 3 on big screens.
                <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'>
                    {/* The same card the category pages use. */}
                    {stories.map(story => (
                        <StoryGridCard key={story.id} story={story} />
                    ))}
                </div>
            )}
        </section>
    )
}

export default LatestStories
