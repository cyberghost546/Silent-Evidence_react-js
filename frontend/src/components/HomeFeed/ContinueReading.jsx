import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { getContinueReading } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'


// ---------------------------------------------------------------
// "CONTINUE READING" on the homepage - stories you started but didn't
// finish, with how far you got. Only for logged-in members, and only
// when there's something to continue (otherwise nothing is shown).
// The numbers are saved by useReadingProgress on the story page.
// ---------------------------------------------------------------
function ContinueList() {
    const { data: rows } = useApi(() => getContinueReading())
    if (!rows || rows.length === 0) return null

    return (
        <section className='mx-auto max-w-7xl px-4 pt-10'>
            <h2 className='flex items-center gap-2 text-lg font-bold text-white'>
                <BookOpen className='h-5 w-5 text-red-500' /> Continue reading
            </h2>
            {/* overflow-x-auto: on a phone the row scrolls sideways. */}
            <ul className='mt-4 flex gap-4 overflow-x-auto pb-2'>
                {rows.map(({ story, progress }) => (
                    <li key={story.id} className='w-60 shrink-0'>
                        <Link to={`/stories/${story.id}`} className='block rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-red-800'>
                            <p className='truncate font-semibold text-white'>{story.title}</p>
                            <p className='truncate text-xs text-gray-500'>by {story.author}</p>
                            <div className='mt-3 flex items-center gap-2'>
                                <span className='h-1.5 flex-1 rounded-full bg-slate-800'>
                                    <span className='block h-full rounded-full bg-red-600' style={{ width: `${progress}%` }} />
                                </span>
                                <span className='text-xs tabular-nums text-gray-400'>{progress}%</span>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}


// The outer part only checks "logged in?" - so the list (and its
// request to Django) isn't even created for visitors.
function ContinueReading() {
    const { user } = useAuth()
    return user ? <ContinueList /> : null
}

export default ContinueReading
