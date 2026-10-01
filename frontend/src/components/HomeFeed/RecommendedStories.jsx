import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { getRecommendedStories } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'


// ---------------------------------------------------------------
// "PICKED FOR YOU" on the homepage - stories you haven't read, picked
// from what you liked, your fear ratings, your Fear Profile and the
// writers you follow. Each card says WHY it was picked.
// Django does the picking: stories/recommend_views.py.
// Logged-in members only, and only when there's something to show.
// ---------------------------------------------------------------
function RecommendedList() {
    const { data: stories } = useApi(() => getRecommendedStories())
    if (!stories || stories.length === 0) return null

    return (
        <section className='mx-auto max-w-7xl px-4'>
            <h2 className='flex items-center gap-2 text-lg font-bold text-white'>
                <Sparkles className='h-5 w-5 text-red-500' /> Picked for you
            </h2>
            {/* overflow-x-auto: on a phone the row scrolls sideways. */}
            <ul className='mt-4 flex gap-4 overflow-x-auto pb-2'>
                {stories.map(story => (
                    <li key={story.id} className='w-64 shrink-0'>
                        <Link to={`/stories/${story.id}`} className='block h-full rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-red-800'>
                            <p className='line-clamp-2 font-semibold text-white'>{story.title}</p>
                            <p className='truncate text-xs text-gray-400'>by {story.author} · {story.reading_time} min read</p>
                            <p className='mt-3 text-xs text-red-300'>{story.reason}</p>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}


// Visitors: nothing at all (not even a request to Django).
function RecommendedStories() {
    const { user } = useAuth()
    return user ? <RecommendedList /> : null
}

export default RecommendedStories
