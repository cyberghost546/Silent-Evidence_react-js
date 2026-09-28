import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { getAdminTrueStories, reviewTrueStory, getCategories } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { AdminFilters, PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> TRUE STORIES (/dashboard/true-stories).
//
// Members send "this really happened to me" stories. Read each one,
// then:
//   Publish - it goes up as a normal story by "Anonymous", tagged
//             true-story, with the rating and category you pick.
//   Reject  - with an optional note the sender will see.
// The sender's name is shown HERE only - never on the site.
// ---------------------------------------------------------------
const FILTERS = [
    { value: 'pending', label: 'Waiting' },
    { value: 'approved', label: 'Published' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
]

const RATINGS = [
    { value: 'all', label: 'All Ages' },
    { value: 'teen', label: '13+ Teen' },
    { value: 'mature', label: '18+ Mature' },
]

const SMALL_INPUT = 'rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-gray-200 [color-scheme:dark]'


// One submission, with its own Publish / Reject controls. Its own
// component so each card keeps its own choices (rating, category, note).
function SubmissionCard({ item, categories, onDone }) {
    const [rating, setRating] = useState('teen')
    const [categoryId, setCategoryId] = useState(item.category_id ?? '')
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)

    async function review(action) {
        setBusy(true)
        try {
            const data = action === 'approve' ? { content_rating: rating, category_id: categoryId || null } : { note }
            await reviewTrueStory(item.id, action, data)
            onDone(action === 'approve' ? `"${item.title}" is published.` : `"${item.title}" was rejected.`)
        } catch (err) {
            onDone(null, err.data?.detail || 'That did not work.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <li className='rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
                <h2 className='text-lg font-bold text-white'>{item.title}</h2>
                <span className='text-xs text-gray-400'>
                    sent by <span className='font-semibold text-gray-200'>{item.submitted_by}</span> (admins only)
                </span>
            </div>
            {item.where_when && <p className='text-sm text-gray-400'>{item.where_when}</p>}

            {/* <details> = a built-in "click to open" box, no React needed. */}
            <details className='mt-3'>
                <summary className='cursor-pointer text-sm text-red-400 hover:text-red-300'>Read the story ({item.body.split(/\s+/).length} words)</summary>
                <p className='mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-200'>{item.body}</p>
            </details>

            {item.status === 'pending' ? (
                <div className='mt-4 flex flex-wrap items-end gap-3 border-t border-slate-800 pt-4'>
                    <label className='text-xs text-gray-400'>
                        Rating
                        <select value={rating} onChange={event => setRating(event.target.value)} className={`${SMALL_INPUT} mt-1 block`}>
                            {RATINGS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </label>
                    <label className='text-xs text-gray-400'>
                        Category
                        <select value={categoryId} onChange={event => setCategoryId(event.target.value)} className={`${SMALL_INPUT} mt-1 block`}>
                            <option value=''>- none -</option>
                            {categories?.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                    </label>
                    <button type='button' disabled={busy} onClick={() => review('approve')} className='rounded-md bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50'>
                        Publish anonymously
                    </button>
                    <div className='ml-auto flex items-end gap-2'>
                        <label className='text-xs text-gray-400'>
                            Note for the sender (optional)
                            <input value={note} onChange={event => setNote(event.target.value)} maxLength={300} className={`${INPUT_STYLE} mt-1 !py-1.5 text-sm`} />
                        </label>
                        <button type='button' disabled={busy} onClick={() => review('reject')} className='rounded-md border border-slate-600 px-3 py-1.5 text-sm text-gray-200 hover:border-red-500 hover:text-red-300 disabled:opacity-50'>
                            Reject
                        </button>
                    </div>
                </div>
            ) : (
                <p className='mt-3 text-xs text-gray-400'>
                    {item.status === 'approved' ? 'Published' : 'Rejected'} by {item.reviewed_by}
                    {item.story_id && <> · <Link to={`/stories/${item.story_id}`} className='text-red-400 hover:text-red-300'>view story</Link></>}
                    {item.admin_note && ` · note: ${item.admin_note}`}
                </p>
            )}
        </li>
    )
}


function TrueStoriesDashboard() {
    const [status, setStatus] = useState('pending')
    const { data: items, error: loadError, reload } = useApi(() => getAdminTrueStories(status), [status])
    const { data: categories } = useApi(() => getCategories())
    const [notice, setNotice] = useState('')
    const [error, setError] = useState('')

    function handleDone(message, problem) {
        setNotice(message || '')
        setError(problem || '')
        reload()
    }

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Eye className='h-7 w-7 text-red-500' />
                True Stories
            </h1>
            <p className='mt-1 text-gray-400'>
                &quot;This really happened to me&quot; stories. Published ones appear on <Link to='/true-stories' className='text-red-400 hover:text-red-300'>True Stories</Link> as written by Anonymous.
            </p>

            <div className='mt-6'>
                <AdminFilters filters={FILTERS} value={status} onChange={setStatus} />
            </div>
            <PageMessages error={error || loadError} notice={notice} />

            <ul className='mt-6 space-y-4'>
                {items?.length === 0 && <li className='text-sm text-gray-500'>Nothing here.</li>}
                {items?.map(item => <SubmissionCard key={item.id} item={item} categories={categories} onDone={handleDone} />)}
            </ul>
        </div>
    )
}

export default TrueStoriesDashboard
