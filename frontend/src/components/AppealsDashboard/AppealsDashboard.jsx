import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Gavel } from 'lucide-react'
import { getAdminAppeals, decideAppeal } from '../../api/client'
import { AdminFilters, PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> APPEALS (/dashboard/appeals). Admins only.
//
// When an admin archives a story (Stories page, or a report),
// its writer can appeal from My Stories: "please bring it back,
// because...". Here the admin decides:
//   Accept - the story is back on the site
//   Reject - it stays archived
// An optional note goes back to the writer (shown on My Stories).
// ---------------------------------------------------------------

const FILTERS = [
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
]

const STATUS_STYLES = {
    pending: 'border-amber-700 text-amber-300',
    accepted: 'border-green-800 text-green-400',
    rejected: 'border-slate-600 text-gray-400',
}


// ---------------------------------------------------------------
// One appeal. Has its own `note` state, so every card's text box
// is separate.
// ---------------------------------------------------------------
function AppealCard({ appeal, onDecide }) {
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)

    async function decide(decision) {
        setBusy(true)
        await onDecide(appeal, decision, note.trim())
        setBusy(false)
    }

    return (
        <li className='rounded-xl border border-slate-800 bg-slate-900/60 p-5'>
            <div className='flex flex-wrap items-center gap-2'>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[appeal.status]}`}>
                    {appeal.status}
                </span>
                <p className='text-sm text-gray-400'>
                    <Link to={`/profile/${appeal.user}`} className='font-semibold text-white hover:text-red-400'>{appeal.user}</Link>
                    {' '}wants "<span className='text-white'>{appeal.story_title}</span>" back
                </p>
                <span className='ml-auto text-xs text-gray-500'>{new Date(appeal.created_at).toLocaleDateString()}</span>
            </div>

            <p className='mt-3 whitespace-pre-line rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-gray-200'>
                {appeal.message}
            </p>

            {appeal.status === 'pending' ? (
                <div className='mt-4'>
                    <textarea
                        value={note}
                        onChange={event => setNote(event.target.value)}
                        rows={2}
                        maxLength={1000}
                        placeholder='A note for the writer (optional) - e.g. why you decided this way'
                        aria-label='Note for the writer'
                        className='w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-600 focus:outline-none'
                    />
                    <div className='mt-2 flex gap-2'>
                        <button
                            type='button'
                            onClick={() => decide('accept')}
                            disabled={busy}
                            className='rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50'
                        >
                            Accept - bring it back
                        </button>
                        <button
                            type='button'
                            onClick={() => decide('reject')}
                            disabled={busy}
                            className='rounded-lg border border-slate-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-slate-400 hover:text-white disabled:opacity-50'
                        >
                            Reject
                        </button>
                    </div>
                </div>
            ) : (
                <p className='mt-3 text-xs text-gray-500'>
                    Decided by {appeal.handled_by ?? 'an admin'}
                    {appeal.admin_note && <> - "{appeal.admin_note}"</>}
                </p>
            )}
        </li>
    )
}


function AppealsDashboard() {
    const [data, setData] = useState(null)
    const [filter, setFilter] = useState('pending')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getAdminAppeals()
            .then(result => setData(result))
            .catch(() => setError('Could not load the appeals.'))
    }, [reloadKey])

    async function handleDecide(appeal, decision, note) {
        setError('')
        try {
            await decideAppeal(appeal.id, decision, note)
            setNotice(decision === 'accept' ? `"${appeal.story_title}" is back on the site.` : 'Appeal rejected.')
            setReloadKey(current => current + 1)
        } catch (err) {
            setError(err.data?.detail || 'Could not save the decision.')
        }
    }

    if (!data) {
        return <p className='text-gray-400'>{error || 'Loading appeals...'}</p>
    }

    const shown = data.appeals.filter(appeal => filter === 'all' || appeal.status === filter)

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Gavel className='h-7 w-7 text-red-500' />
                Appeals
            </h1>
            <p className='mt-1 text-gray-400'>Writers asking to get an archived story back.</p>

            <div className='mt-6'>
                <AdminFilters
                    filters={FILTERS.map(item => ({
                        ...item,
                        label: item.value === 'all' ? item.label : `${item.label} (${data.counts[item.value]})`,
                    }))}
                    value={filter}
                    onChange={setFilter}
                />
            </div>

            <PageMessages error={error} notice={notice} />

            {shown.length === 0 ? (
                <p className='mt-10 rounded-xl border border-slate-800 py-12 text-center text-gray-500'>No appeals here.</p>
            ) : (
                <ul className='mt-6 space-y-4'>
                    {shown.map(appeal => (
                        <AppealCard key={appeal.id} appeal={appeal} onDecide={handleDecide} />
                    ))}
                </ul>
            )}
        </div>
    )
}

export default AppealsDashboard
