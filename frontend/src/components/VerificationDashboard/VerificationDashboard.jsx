import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, ExternalLink } from 'lucide-react'
import { getVerificationRequests, decideVerification } from '../../api/client'
import { AdminFilters, PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> VERIFICATION (/dashboard/verification).
//
// Members ask for the blue check mark on Settings -> Account.
// Each request shows who they are, why, a proof link, and a few
// facts (stories, member since) to help decide.
//   Approve -> Profile.is_verified = true (the check mark appears)
//   Reject  -> the note is shown to the member
// To take a check mark away later: Users page -> Unverify.
// ---------------------------------------------------------------

const FILTERS = [
    { value: 'pending', label: 'Waiting' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
]


function RequestCard({ item, onDecided }) {
    const [note, setNote] = useState('')

    return (
        <li className='rounded-xl border border-slate-800 bg-slate-900/60 p-5'>
            <div className='flex flex-wrap items-center gap-2 text-sm'>
                <Link to={`/profile/${item.user}`} className='font-semibold text-white hover:text-red-400'>{item.user}</Link>
                <span className='text-gray-500'>
                    · {item.story_count} published {item.story_count === 1 ? 'story' : 'stories'} · member since {new Date(item.date_joined).toLocaleDateString()}
                </span>
                <span className='ml-auto text-xs text-gray-500'>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>

            <p className='mt-3 whitespace-pre-line text-sm text-gray-200'>{item.reason}</p>
            {item.proof_url && (
                // An outside link: new tab + rel for safety (see InfoPage).
                <a href={item.proof_url} target='_blank' rel='noopener noreferrer' className='mt-2 inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300'>
                    {item.proof_url} <ExternalLink className='h-3.5 w-3.5' />
                </a>
            )}

            {item.status === 'pending' ? (
                <div className='mt-4 flex flex-wrap gap-2'>
                    <input
                        value={note}
                        onChange={event => setNote(event.target.value)}
                        placeholder='Note for the member (optional)'
                        aria-label='Note for the member'
                        className='min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-red-600 focus:outline-none'
                    />
                    <button type='button' onClick={() => onDecided(item, 'approve', note)} className='flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500'>
                        <BadgeCheck className='h-4 w-4' /> Approve
                    </button>
                    <button type='button' onClick={() => onDecided(item, 'reject', note)} className='rounded-lg border border-slate-600 px-4 py-1.5 text-sm text-gray-300 hover:border-slate-400'>
                        Reject
                    </button>
                </div>
            ) : (
                item.admin_note && <p className='mt-3 text-xs text-gray-500'>Note: "{item.admin_note}"</p>
            )}
        </li>
    )
}


function VerificationDashboard() {
    const [data, setData] = useState(null)
    const [filter, setFilter] = useState('pending')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getVerificationRequests()
            .then(result => setData(result))
            .catch(() => setError('Could not load the requests.'))
    }, [reloadKey])

    async function handleDecided(item, decision, note) {
        try {
            await decideVerification(item.id, decision, note.trim())
            setNotice(decision === 'approve' ? `${item.user} is verified.` : `Request from ${item.user} rejected.`)
            setReloadKey(current => current + 1)
        } catch (err) {
            setError(err.data?.detail || 'Could not save the decision.')
        }
    }

    if (!data) return <p className='text-gray-400'>{error || 'Loading...'}</p>

    const shown = data.requests.filter(item => item.status === filter)

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <BadgeCheck className='h-7 w-7 text-blue-400' />
                Verification
            </h1>
            <p className='mt-1 text-gray-400'>Requests for the blue check mark. {data.verified_users.length} members are verified.</p>

            <div className='mt-6'>
                <AdminFilters filters={FILTERS.map(item => ({ ...item, label: `${item.label} (${data.counts[item.value]})` }))} value={filter} onChange={setFilter} />
            </div>

            <PageMessages error={error} notice={notice} />

            {shown.length === 0 ? (
                <p className='mt-8 rounded-xl border border-slate-800 py-12 text-center text-gray-500'>No requests here.</p>
            ) : (
                <ul className='mt-6 space-y-3'>
                    {shown.map(item => <RequestCard key={item.id} item={item} onDecided={handleDecided} />)}
                </ul>
            )}

            {data.verified_users.length > 0 && (
                <p className='mt-8 text-sm text-gray-500'>
                    Verified now: {data.verified_users.map((name, index) => (
                        <span key={name}>
                            {index > 0 && ', '}
                            <Link to={`/profile/${name}`} className='text-gray-300 hover:text-white'>{name}</Link>
                        </span>
                    ))}
                </p>
            )}
        </div>
    )
}

export default VerificationDashboard
