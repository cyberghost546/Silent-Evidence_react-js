import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Heart, MessageSquare, PenLine, Trash2, UserPlus } from 'lucide-react'
import { getMyStories, setStoryPublished, deleteMyStory, sendInvite } from '../../api/client'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import { BUTTON_STYLE, INPUT_STYLE, FIELD_ERROR_STYLE } from '../../styles/formStyles'
import { formatShortDate } from '../../utils/format'


// ---------------------------------------------------------------
// MY STORIES (/my-stories) - logged-in users only (App.jsx).
//
// Everything you wrote, drafts included. Each row can:
//   - open the story (when it's published)
//   - Publish / Unpublish it
//   - invite a co-author
//   - delete it (asks first)
//
// Django: MyStoriesView + ManageStoryView in backend/stories/views.py.
// ---------------------------------------------------------------


// The coloured badge for each status, as data.
const STATUS_BADGES = {
    published: { label: 'Published', style: 'border-green-800 bg-green-950/40 text-green-300' },
    scheduled: { label: 'Scheduled', style: 'border-blue-800 bg-blue-950/40 text-blue-300' },
    draft: { label: 'Draft', style: 'border-slate-600 bg-slate-800 text-gray-300' },
}

// The small outlined buttons on each row.
const SMALL_BUTTON = 'flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-slate-500 hover:text-white'


// ---------------------------------------------------------------
// The little "invite a co-author" form that opens inside a row.
// It has its own state, so every row's form is separate.
// ---------------------------------------------------------------
function InviteForm({ storyId, onDone }) {
    const [username, setUsername] = useState('')
    const [error, setError] = useState('')
    const [sending, setSending] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()
        setSending(true)
        setError('')
        try {
            await sendInvite(storyId, username.trim())
            // Tell the row we're done, with a message to show.
            onDone(`Invite sent to ${username.trim()}.`)
        } catch (err) {
            // e.g. "No user with that username."
            setError(err.data?.detail || 'Could not send the invite.')
            setSending(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className='mt-4 border-t border-slate-800 pt-4'>
            <div className='flex gap-2'>
                <input
                    value={username}
                    onChange={event => setUsername(event.target.value)}
                    placeholder='Username to invite...'
                    aria-label='Username to invite'
                    className={INPUT_STYLE}
                />
                <button type='submit' disabled={sending || !username.trim()} className={`${BUTTON_STYLE} shrink-0`}>
                    Invite
                </button>
            </div>
            {error && <p className={FIELD_ERROR_STYLE}>{error}</p>}
        </form>
    )
}


// ---------------------------------------------------------------
// One of your stories.
//
// Props:
//   story       - one row from Django (MyStorySerializer)
//   onChanged   - the row was published / unpublished: here's the new version
//   onDeleted   - the row was deleted
// ---------------------------------------------------------------
function MyStoryRow({ story, onChanged, onDeleted }) {
    const [inviting, setInviting] = useState(false)
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)

    const badge = STATUS_BADGES[story.status]

    async function togglePublished() {
        setBusy(true)
        try {
            const updated = await setStoryPublished(story.id, !story.is_published)
            onChanged(updated)
        } catch {
            setNote('Could not change it. Try again.')
        }
        setBusy(false)
    }

    async function handleDelete() {
        // The title in the question, so you can't delete the wrong one.
        if (!window.confirm(`Delete "${story.title}" for good? This cannot be undone.`)) return

        setBusy(true)
        try {
            await deleteMyStory(story.id)
            onDeleted(story.id)
        } catch {
            setNote('Could not delete it. Try again.')
            setBusy(false)
        }
    }

    return (
        <li className='rounded-xl border border-slate-800 bg-slate-900 p-5'>
            {/* Top part: title + details on the left, buttons on the right. */}
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.style}`}>
                            {badge.label}
                        </span>
                        {story.category && <span className='text-xs text-gray-500'>{story.category}</span>}
                    </div>

                    <h2 className='mt-2 truncate text-lg font-bold text-white'>{story.title}</h2>

                    {/* The numbers, with small icons. */}
                    <p className='mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-400'>
                        <span className='flex items-center gap-1'><Eye className='h-3.5 w-3.5' /> {story.views}</span>
                        <span className='flex items-center gap-1'><Heart className='h-3.5 w-3.5' /> {story.like_count}</span>
                        <span className='flex items-center gap-1'><MessageSquare className='h-3.5 w-3.5' /> {story.comment_count}</span>
                        <span>Written {formatShortDate(story.created_at)}</span>
                    </p>
                </div>

                <div className='flex shrink-0 flex-wrap gap-2'>
                    {/* Only published stories have a page anyone can open. */}
                    {story.status === 'published' && (
                        <Link to={`/stories/${story.id}`} className={SMALL_BUTTON}>
                            <Eye className='h-3.5 w-3.5' /> View
                        </Link>
                    )}

                    <button type='button' onClick={togglePublished} disabled={busy} className={SMALL_BUTTON}>
                        {story.is_published ? 'Unpublish' : 'Publish'}
                    </button>

                    <button type='button' onClick={() => setInviting(!inviting)} className={SMALL_BUTTON}>
                        <UserPlus className='h-3.5 w-3.5' /> Co-author
                    </button>

                    <button
                        type='button'
                        onClick={handleDelete}
                        disabled={busy}
                        aria-label={`Delete ${story.title}`}
                        className='flex items-center rounded-lg border border-red-900 px-2.5 py-1.5 text-red-400 transition-colors hover:bg-red-950'
                    >
                        <Trash2 className='h-3.5 w-3.5' />
                    </button>
                </div>
            </div>

            {inviting && (
                <InviteForm
                    storyId={story.id}
                    onDone={message => {
                        setInviting(false)
                        setNote(message)
                    }}
                />
            )}

            {note && <p className='mt-3 text-xs text-gray-400'>{note}</p>}
        </li>
    )
}


function MyStoriesPage() {
    const [stories, setStories] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        getMyStories()
            .then(data => setStories(data))
            .catch(() => setError('Could not load your stories.'))
    }, [])

    // A row changed -> swap in the new version, keep the others.
    // .map() goes over every story and returns either the updated
    // one (same id) or the old one untouched.
    function replaceStory(updated) {
        setStories(stories.map(story => (story.id === updated.id ? updated : story)))
    }

    function removeStory(id) {
        setStories(stories.filter(story => story.id !== id))
    }

    const writeButton = (
        <Link to='/write' className={`${BUTTON_STYLE} flex items-center gap-2`}>
            <PenLine className='h-4 w-4' />
            Write a Story
        </Link>
    )

    return (
        <PageLayout title='My Stories' subtitle='Everything you wrote - published, scheduled and drafts.' action={writeButton} width='narrow'>
            {error && <p className='mb-6 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300'>{error}</p>}

            {stories === null && !error && <p className='py-20 text-center text-gray-400'>Loading your stories...</p>}

            {stories?.length === 0 && (
                <PageMessage title="You haven't written a story yet." text='Every horror starts with a first line.'>
                    <Link to='/write' className={BUTTON_STYLE}>Write your first story</Link>
                </PageMessage>
            )}

            {stories?.length > 0 && (
                <ul className='space-y-4'>
                    {stories.map(story => (
                        <MyStoryRow key={story.id} story={story} onChanged={replaceStory} onDeleted={removeStory} />
                    ))}
                </ul>
            )}
        </PageLayout>
    )
}

export default MyStoriesPage
