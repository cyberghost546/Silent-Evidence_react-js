import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ListOrdered, Lock } from 'lucide-react'
import { getMyReadingLists, getUserReadingLists, createReadingList } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { INPUT_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// A row of reading-list cards. Two ways to use it:
//
//   <ReadingListsSection mine />              -> My Lists page: YOUR lists
//                                                (private ones too) + "new list"
//   <ReadingListsSection username='raven' />  -> a profile: raven's PUBLIC lists
//
// Shows nothing at all on a profile with no public lists.
// ---------------------------------------------------------------
function ReadingListsSection({ mine = false, username }) {
    const navigate = useNavigate()
    const { data: lists } = useApi(() => (mine ? getMyReadingLists() : getUserReadingLists(username)), [mine, username])
    const [title, setTitle] = useState('')
    const [problem, setProblem] = useState('')

    async function handleCreate(event) {
        event.preventDefault()
        setProblem('')
        try {
            const list = await createReadingList({ title: title.trim(), is_public: true })
            navigate(`/reading-lists/${list.id}`)
        } catch (err) {
            setProblem(err.data?.detail || 'Could not make the list.')
        }
    }

    if (!lists || (!mine && lists.length === 0)) return null

    return (
        <section className='mb-10'>
            <h2 className='flex items-center gap-2 text-lg font-bold text-white'>
                <ListOrdered className='h-5 w-5 text-red-500' />
                {mine ? 'Your reading lists' : 'Reading lists'}
            </h2>

            <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {lists.map(list => (
                    <Link key={list.id} to={`/reading-lists/${list.id}`} className='rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-600'>
                        <p className='flex items-center gap-2 font-semibold text-white'>
                            <span className='truncate'>{list.title}</span>
                            {!list.is_public && <Lock className='h-3.5 w-3.5 shrink-0 text-gray-500' aria-label='Private' />}
                        </p>
                        <p className='mt-1 text-xs text-gray-400'>{list.story_count} {list.story_count === 1 ? 'story' : 'stories'}</p>
                    </Link>
                ))}

                {mine && (
                    <form onSubmit={handleCreate} className='flex gap-2 rounded-xl border border-dashed border-slate-700 p-3'>
                        <input value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder='New reading list...' aria-label='New list name' className={`${INPUT_STYLE} py-2! text-sm`} />
                        <button type='submit' disabled={!title.trim()} className='shrink-0 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50'>Make</button>
                    </form>
                )}
            </div>
            {problem && <p className='mt-2 text-sm text-red-400'>{problem}</p>}
        </section>
    )
}

export default ReadingListsSection
