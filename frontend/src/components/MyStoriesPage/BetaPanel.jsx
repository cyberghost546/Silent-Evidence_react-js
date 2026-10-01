import { useState } from 'react'
import { X } from 'lucide-react'
import { getBetaReaders, inviteBetaReader, removeBetaReader } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { formatShortDate } from '../../utils/format'
import { INPUT_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// BETA READERS for one draft (opened from a row on My Stories).
//
//   <BetaPanel storyId={story.id} />
//
// Invite members by username - they get a notification and can open
// this draft (only this one). Their feedback shows up below, and only
// you can see it. Up to 10 readers.
// ---------------------------------------------------------------
function BetaPanel({ storyId }) {
    const { data, error: loadError, reload } = useApi(() => getBetaReaders(storyId), [storyId])
    const [username, setUsername] = useState('')
    const [error, setError] = useState('')

    async function handleInvite(event) {
        event.preventDefault()
        setError('')
        try {
            await inviteBetaReader(storyId, username.trim())
            setUsername('')
            reload()
        } catch (err) {
            setError(err.data?.detail || 'Could not invite them.')
        }
    }

    async function handleRemove(name) {
        await removeBetaReader(storyId, name)
        reload()
    }

    return (
        <div className='mt-4 rounded-xl border border-purple-900/60 bg-purple-950/10 p-4'>
            <p className='text-sm font-semibold text-purple-200'>Beta readers</p>
            <p className='text-xs text-gray-400'>They can read this draft before anyone else and send you private feedback.</p>

            <form onSubmit={handleInvite} className='mt-3 flex gap-2'>
                <input value={username} onChange={event => setUsername(event.target.value)} placeholder='Username' aria-label='Username of your beta reader' className={`${INPUT_STYLE} py-2 text-sm`} />
                <button type='submit' disabled={!username.trim()} className='shrink-0 rounded-lg bg-purple-700 px-3 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50'>Invite</button>
            </form>
            {(error || loadError) && <p className='mt-2 text-xs text-red-400'>{error || loadError}</p>}

            {data?.readers.length > 0 && (
                <ul className='mt-3 flex flex-wrap gap-2'>
                    {data.readers.map(name => (
                        <li key={name} className='flex items-center gap-1 rounded-full border border-purple-800 px-2.5 py-0.5 text-xs text-purple-100'>
                            {name}
                            <button type='button' onClick={() => handleRemove(name)} aria-label={`Remove ${name}`} className='text-purple-300 hover:text-white'>
                                <X className='h-3 w-3' />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <p className='mt-4 text-xs font-semibold uppercase tracking-wider text-gray-500'>Feedback</p>
            {data?.feedback.length === 0 && <p className='mt-1 text-xs text-gray-500'>No feedback yet.</p>}
            <ul className='mt-2 space-y-2'>
                {data?.feedback.map(item => (
                    <li key={item.id} className='rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm'>
                        <p className='text-xs text-gray-500'>{item.reader} · {formatShortDate(item.created_at)}</p>
                        <p className='mt-1 whitespace-pre-line text-gray-200'>{item.body}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default BetaPanel
