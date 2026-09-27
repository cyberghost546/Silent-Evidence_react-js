import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Sun } from 'lucide-react'
import { getStoryPicker, updateAdminStory } from '../../api/client'
import { AdminSearch, PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> STORY OF WEEK (/dashboard/story-of-week).
//
// The two big picks on the homepage:
//   Story of the Week  (trophy)
//   Story of the Day   (sun)
// Only one of each at a time - picking a new one un-picks the old
// one (Django does that, see AdminStoryDetailView).
//
// At the top: what's picked now. Below: every published story,
// most viewed first, to choose from.
// ---------------------------------------------------------------

// The two picks, as data, so both work the same way.
const PICKS = [
    { field: 'is_story_of_the_week', label: 'Story of the Week', icon: Trophy, color: 'text-yellow-400', button: 'Make Story of the Week' },
    { field: 'is_story_of_the_day', label: 'Story of the Day', icon: Sun, color: 'text-orange-400', button: 'Make Story of the Day' },
]


function StoryOfWeekDashboard() {
    const [stories, setStories] = useState(null)
    const [search, setSearch] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getStoryPicker()
            .then(data => setStories(data))
            .catch(() => setError('Could not load the stories.'))
    }, [reloadKey])

    // turnOn = true to pick it, false to remove the pick.
    async function setPick(story, pick, turnOn) {
        setError('')
        try {
            await updateAdminStory(story.id, { [pick.field]: turnOn })
            setNotice(turnOn ? `"${story.title}" is now the ${pick.label}.` : `No ${pick.label} any more.`)
            setReloadKey(current => current + 1)
        } catch {
            setError('Could not change it.')
        }
    }

    if (!stories) {
        return <p className='text-gray-400'>{error || 'Loading stories...'}</p>
    }

    const words = search.trim().toLowerCase()
    // [...stories] = a COPY, because .sort() changes the list it's
    // called on, and we must never change state directly.
    const shown = [...stories]
        .sort((a, b) => b.views - a.views)
        .filter(story => words === '' || story.title.toLowerCase().includes(words) || story.author.toLowerCase().includes(words))

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Trophy className='h-7 w-7 text-yellow-400' />
                Story of the Week
            </h1>
            <p className='mt-1 text-gray-400'>The homepage picks. One of each at a time.</p>

            <PageMessages error={error} notice={notice} />

            {/* ---------- PICKED NOW ---------- */}
            <div className='mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {PICKS.map(pick => {
                    const current = stories.find(story => story[pick.field])
                    const Icon = pick.icon
                    return (
                        <div key={pick.field} className='rounded-xl border border-slate-800 bg-slate-900/60 p-5'>
                            <p className={`flex items-center gap-2 text-sm font-semibold ${pick.color}`}>
                                <Icon className='h-4 w-4' />
                                {pick.label}
                            </p>
                            {current ? (
                                <>
                                    <Link to={`/stories/${current.id}`} className='mt-2 block text-lg font-bold text-white hover:text-red-400'>{current.title}</Link>
                                    <p className='text-sm text-gray-500'>by {current.author}</p>
                                    <button type='button' onClick={() => setPick(current, pick, false)} className='mt-3 text-xs text-gray-400 underline hover:text-white'>
                                        Remove
                                    </button>
                                </>
                            ) : (
                                <p className='mt-2 text-sm text-gray-500'>Nothing picked - the homepage leaves this spot out.</p>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* ---------- CHOOSE ---------- */}
            <div className='mt-8 flex'>
                <AdminSearch value={search} onChange={setSearch} placeholder='Search by title or author...' />
            </div>

            <ul className='mt-4 space-y-2'>
                {shown.map(story => (
                    <li key={story.id} className='flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3'>
                        <div className='min-w-0 flex-1'>
                            <p className='truncate font-semibold text-white'>{story.title}</p>
                            <p className='text-xs text-gray-500'>by {story.author} · {story.views} views</p>
                        </div>
                        {PICKS.map(pick => {
                            const Icon = pick.icon
                            const isPicked = story[pick.field]
                            return (
                                <button
                                    key={pick.field}
                                    type='button'
                                    onClick={() => setPick(story, pick, !isPicked)}
                                    aria-pressed={isPicked}
                                    title={isPicked ? `Remove as ${pick.label}` : pick.button}
                                    className={`flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs transition-colors ${
                                        isPicked ? `border-yellow-700 bg-yellow-950/40 ${pick.color}` : 'border-slate-700 text-gray-400 hover:border-slate-500 hover:text-white'
                                    }`}
                                >
                                    <Icon className='h-3.5 w-3.5' />
                                    {pick.label.replace('Story of the ', '')}
                                </button>
                            )
                        })}
                    </li>
                ))}
                {shown.length === 0 && <p className='text-sm text-gray-500'>No published stories match.</p>}
            </ul>
        </div>
    )
}

export default StoryOfWeekDashboard
