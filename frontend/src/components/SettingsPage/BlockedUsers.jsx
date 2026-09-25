import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Avatar from '../Avatar/Avatar'
import { SettingsSection } from './SettingsParts'
import { getBlockedUsers, blockUser, unblockUser } from '../../api/client'
import { INPUT_STYLE, FIELD_ERROR_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// "Blocked Users" - type a username, press Block. Below it, the
// list of people you blocked, each with an Unblock button.
//
// Different from the other sections: blocks are their OWN table in
// Django (Block in accounts/models.py), not a setting. So this
// component loads and saves the list by itself.
//
// Django then leaves their stories and comments out of everything
// you see (stories_for() in backend/stories/models.py).
// ---------------------------------------------------------------
function BlockedUsers({ onMessage }) {
    // ['troll99', 'spammer'] - just usernames.
    const [blocked, setBlocked] = useState([])
    const [username, setUsername] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    // Load the list once, when the section appears.
    useEffect(() => {
        getBlockedUsers()
            .then(data => setBlocked(data))
            .catch(() => setError('Could not load your blocked users.'))
    }, [])

    async function handleBlock(event) {
        event.preventDefault()

        // .trim() removes spaces at the start and end.
        const name = username.trim()
        if (!name) return

        setSaving(true)
        setError('')
        try {
            // Django answers with the whole new list.
            const newList = await blockUser(name)
            setBlocked(newList)
            setUsername('')
            onMessage(`${name} is blocked.`)
        } catch (err) {
            // e.g. "No user with that username."
            setError(err.data?.detail || 'Could not block that user.')
        } finally {
            setSaving(false)
        }
    }

    async function handleUnblock(name) {
        try {
            await unblockUser(name)
            // Take them out of the list on screen too.
            setBlocked(blocked.filter(person => person !== name))
            onMessage(`${name} is unblocked.`)
        } catch {
            onMessage('Could not unblock. Try again.', true)
        }
    }

    return (
        <SettingsSection id='blocked' title='Blocked Users' description='Block users to hide their stories and comments from you.'>
            <form onSubmit={handleBlock} className='flex gap-3'>
                <input
                    value={username}
                    onChange={event => setUsername(event.target.value)}
                    placeholder='Enter username to block...'
                    aria-label='Username to block'
                    className={INPUT_STYLE}
                />
                {/* Dark red until you type something, so it doesn't
                    shout for attention while it can't do anything. */}
                <button
                    type='submit'
                    disabled={saving || !username.trim()}
                    className='shrink-0 rounded-lg bg-red-600 px-5 font-bold text-white transition-colors hover:bg-red-700 disabled:bg-red-950 disabled:text-red-300/60'
                >
                    Block
                </button>
            </form>

            {error && <p className={FIELD_ERROR_STYLE}>{error}</p>}

            {blocked.length === 0 ? (
                <p className='mt-4 text-sm text-gray-500'>You haven't blocked anyone.</p>
            ) : (
                <ul className='mt-4 space-y-2'>
                    {blocked.map(name => (
                        <li key={name} className='flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-2'>
                            <span className='flex items-center gap-3 text-sm text-white'>
                                <Avatar username={name} />
                                {name}
                            </span>
                            <button
                                type='button'
                                onClick={() => handleUnblock(name)}
                                className='flex items-center gap-1 text-xs text-gray-400 hover:text-white'
                            >
                                <X className='h-3.5 w-3.5' />
                                Unblock
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </SettingsSection>
    )
}

export default BlockedUsers
