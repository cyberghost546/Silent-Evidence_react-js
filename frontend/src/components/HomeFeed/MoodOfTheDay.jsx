import { useState, useEffect } from 'react'
import { Moon } from 'lucide-react'
import { getMoodOfTheDay } from '../../api/client'
import StoryGridCard from '../StorySections/StoryGridCard'


// ---------------------------------------------------------------
// "Mood of the Day" on the homepage: today's mood, an optional
// line from the admins, and up to 3 stories in that mood.
//
// Admins plan the moods ahead on Admin Dashboard -> Mood of Day.
// No mood planned for today, or no stories in it = the whole
// section is left out (a heading with nothing under it looks broken).
// ---------------------------------------------------------------
function MoodOfTheDay() {
    const [mood, setMood] = useState(null)

    useEffect(() => {
        getMoodOfTheDay()
            .then(data => setMood(data))
            .catch(() => {})
    }, [])

    if (!mood || mood.stories.length === 0) return null

    return (
        <section className='mx-auto max-w-6xl'>
            <div className='mb-5 flex flex-wrap items-end justify-between gap-2'>
                <div>
                    <p className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-300'>
                        <Moon className='h-4 w-4' />
                        Mood of the day
                    </p>
                    <h2 className='mt-1 text-3xl font-bold text-white'>{mood.mood_label}</h2>
                    {mood.note && <p className='mt-1 text-sm text-gray-400'>{mood.note}</p>}
                </div>
            </div>

            {/* .slice(0, 3) = the first 3 (Django sends up to 6). */}
            <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                {mood.stories.slice(0, 3).map(story => (
                    <StoryGridCard key={story.id} story={story} />
                ))}
            </div>
        </section>
    )
}

export default MoodOfTheDay
