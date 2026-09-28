import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStories, mediaUrl } from '../../api/client'
import SidebarBox from './SidebarBox'


// The top 3 get a coloured number, the rest are grey. Written out in
// full so Tailwind can see the class names (see styles/accents.js).
const RANK_COLORS = ['text-red-500', 'text-gray-300', 'text-amber-600']


// ---------------------------------------------------------------
// "TRENDING" - the most-viewed stories, numbered 1 to 5.
// Uses the same /api/stories/ endpoint as everything else, just
// with sort=popular.
//
// Usage:
//   <TrendingList />            -> top 5
//   <TrendingList limit={3} />  -> top 3
// ---------------------------------------------------------------
function TrendingList({ limit = 5 }) {
    const [stories, setStories] = useState([])

    useEffect(() => {
        getStories({ sort: 'popular', limit })
            .then(setStories)
            .catch(() => setStories([]))
    }, [limit])

    return (
        <SidebarBox title='Trending' badge='Most read'>
            {stories.length === 0 ? (
                <p className='py-4 text-center text-sm text-gray-500'>Nothing trending yet.</p>
            ) : (
                // <ol> = a numbered list. We draw the numbers ourselves
                // (bigger and coloured), so list-none hides the default ones.
                <ol className='list-none space-y-2'>
                    {/* The second argument of .map() is the position:
                        0, 1, 2... so the rank is index + 1. */}
                    {stories.map((story, index) => (
                        <li key={story.id}>
                            <Link
                                to={`/stories/${story.id}`}
                                className='flex items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-800/60 p-2 transition-colors hover:border-slate-500'
                            >
                                <span className={`w-5 text-center text-lg font-bold ${RANK_COLORS[index] || 'text-gray-500'}`}>
                                    {index + 1}
                                </span>

                                {/* Small square picture, or a dark square without one. */}
                                {story.cover_image ? (
                                    <img src={mediaUrl(story.cover_image)} alt='' className='h-10 w-10 shrink-0 rounded object-cover' />
                                ) : (
                                    <span className='h-10 w-10 shrink-0 rounded bg-linear-to-br from-slate-700 to-slate-900' />
                                )}

                                {/* min-w-0 lets truncate work inside a flex row. */}
                                <div className='min-w-0'>
                                    {story.category && (
                                        <p className='truncate text-[10px] font-bold uppercase tracking-wider text-red-400'>{story.category}</p>
                                    )}
                                    <p className='truncate text-sm font-semibold text-white'>{story.title}</p>
                                    <p className='truncate text-xs text-gray-500'>{story.author}</p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}
        </SidebarBox>
    )
}

export default TrendingList
