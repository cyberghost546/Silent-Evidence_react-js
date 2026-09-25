import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { getInvites, answerInvite, cancelInvite } from '../../api/client'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import Avatar from '../Avatar/Avatar'
import { formatShortDate } from '../../utils/format'


// ---------------------------------------------------------------
// CO-AUTHOR INVITES (/invites) - logged-in users only (App.jsx).
//
// Two lists, switched with the buttons at the top:
//   Received - people asking YOU to co-write their story.
//              Accept or Decline.
//   Sent     - invites YOU sent (from the My Stories page).
//              Cancel while they're still pending.
//
// Accepted = your name is shown on the story as a co-author.
// Django: InviteListView + InviteActionView in backend/stories/views.py.
// ---------------------------------------------------------------

const TABS = [
    { value: 'received', label: 'Received' },
    { value: 'sent', label: 'Sent' },
]

// The coloured status word, as data.
const STATUS_STYLES = {
    pending: 'text-amber-300',
    accepted: 'text-green-400',
    declined: 'text-gray-500',
}


// ---------------------------------------------------------------
// One invite.
//
// Props:
//   invite    - { id, story_id, story_title, from_user, to_user, status, created_at }
//   direction - 'received' or 'sent' (changes the text and buttons)
//   onAnswer  - (id, 'accept' | 'decline') for received invites
//   onCancel  - (id) for sent invites
// ---------------------------------------------------------------
function InviteRow({ invite, direction, onAnswer, onCancel }) {
    // The OTHER person: who sent it to me, or who I sent it to.
    const otherPerson = direction === 'received' ? invite.from_user : invite.to_user
    const isPending = invite.status === 'pending'

    return (
        <li className='flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center'>
            <Avatar username={otherPerson} />

            <div className='min-w-0 flex-1'>
                <p className='text-sm text-gray-300'>
                    {direction === 'received' ? (
                        <><span className='font-semibold text-white'>{otherPerson}</span> invited you to co-write</>
                    ) : (
                        <>You invited <span className='font-semibold text-white'>{otherPerson}</span> to co-write</>
                    )}
                </p>
                {/* The story title links to the story. (A draft has no
                    public page yet, so that link may show "not found".) */}
                <Link to={`/stories/${invite.story_id}`} className='mt-1 block truncate font-bold text-white hover:text-red-400'>
                    {invite.story_title}
                </Link>
                <p className='mt-1 text-xs text-gray-500'>
                    {formatShortDate(invite.created_at)} ·{' '}
                    {/* {' '} = a space. JSX drops spaces at the end of a line. */}
                    <span className={`capitalize ${STATUS_STYLES[invite.status]}`}>{invite.status}</span>
                </p>
            </div>

            {/* Buttons only while the invite is still waiting. */}
            {isPending && direction === 'received' && (
                <div className='flex gap-2'>
                    <button
                        type='button'
                        onClick={() => onAnswer(invite.id, 'accept')}
                        className='flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700'
                    >
                        <Check className='h-4 w-4' /> Accept
                    </button>
                    <button
                        type='button'
                        onClick={() => onAnswer(invite.id, 'decline')}
                        className='flex items-center gap-1.5 rounded-lg border border-slate-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-slate-400 hover:text-white'
                    >
                        <X className='h-4 w-4' /> Decline
                    </button>
                </div>
            )}

            {isPending && direction === 'sent' && (
                <button
                    type='button'
                    onClick={() => onCancel(invite.id)}
                    className='rounded-lg border border-slate-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-red-700 hover:text-red-300'
                >
                    Cancel invite
                </button>
            )}
        </li>
    )
}


function InvitesPage() {
    const [tab, setTab] = useState('received')

    // null = loading. Then { received: [...], sent: [...] }.
    const [invites, setInvites] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        getInvites()
            .then(data => setInvites(data))
            .catch(() => setError('Could not load your invites.'))
    }, [])

    async function handleAnswer(id, answer) {
        try {
            const updated = await answerInvite(id, answer)
            // Swap the answered invite for its new version.
            setInvites({
                ...invites,
                received: invites.received.map(invite => (invite.id === id ? updated : invite)),
            })
        } catch {
            setError('Could not answer that invite. Try again.')
        }
    }

    async function handleCancel(id) {
        try {
            await cancelInvite(id)
            setInvites({ ...invites, sent: invites.sent.filter(invite => invite.id !== id) })
        } catch {
            setError('Could not cancel that invite. Try again.')
        }
    }

    // The list for the tab you're on. invites?.[tab] = invites.received
    // or invites.sent - [tab] picks the key by the VALUE of `tab`.
    const list = invites?.[tab] ?? []

    // How many received invites still wait for an answer (shown on
    // the tab so you notice them).
    const waiting = invites?.received.filter(invite => invite.status === 'pending').length ?? 0

    // Copy TABS but with the count added to the "Received" label.
    const tabOptions = TABS.map(item =>
        item.value === 'received' && waiting > 0 ? { ...item, label: `Received (${waiting})` } : item
    )

    return (
        <PageLayout
            title='Co-author Invites'
            subtitle='Write stories together. Invite people from the My Stories page.'
            action={<SegmentedControl label='Which invites' options={tabOptions} value={tab} onChange={setTab} />}
            width='narrow'
        >
            {error && <p className='mb-6 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300'>{error}</p>}

            {invites === null && !error && <p className='py-20 text-center text-gray-400'>Loading your invites...</p>}

            {invites && list.length === 0 && (
                tab === 'received' ? (
                    <PageMessage title='No invites yet.' text='When someone asks you to co-write a story, it shows up here.' />
                ) : (
                    <PageMessage title="You haven't invited anyone yet." text='Open My Stories and press "Co-author" on one of your stories.'>
                        <Link to='/my-stories' className='text-sm font-semibold text-red-400 hover:text-red-300'>Go to My Stories →</Link>
                    </PageMessage>
                )
            )}

            {list.length > 0 && (
                <ul className='space-y-3'>
                    {list.map(invite => (
                        <InviteRow
                            key={invite.id}
                            invite={invite}
                            direction={tab}
                            onAnswer={handleAnswer}
                            onCancel={handleCancel}
                        />
                    ))}
                </ul>
            )}
        </PageLayout>
    )
}

export default InvitesPage
