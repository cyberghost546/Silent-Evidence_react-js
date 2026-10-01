import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Pin, Lock, MessageSquare, Plus } from 'lucide-react'
import { getBoard, startThread } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import { usePageTitle } from '../../hooks/usePageTitle'
import { timeAgo } from '../../utils/format'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ONE BOARD (/forums/:slug) - its threads, and "New thread".
// Pinned threads come first, then the most recently active
// (Django sorts them). Anyone can read; members can post.
// ---------------------------------------------------------------
function BoardPage() {
    const { slug } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const requireLogin = useRequireLogin()
    const { data: board, error } = useApi(() => getBoard(slug), [slug])
    usePageTitle(board?.name ?? 'Forums')

    // The "new thread" form: closed until you click the button.
    const [writing, setWriting] = useState(false)
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [sending, setSending] = useState(false)
    const [formError, setFormError] = useState('')

    function openForm() {
        if (!requireLogin()) return   // logged out -> Log In first
        setWriting(true)
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setSending(true)
        setFormError('')
        try {
            const thread = await startThread(slug, title.trim(), body.trim())
            // Straight to your new thread.
            navigate(`/forums/${slug}/${thread.id}`)
        } catch (err) {
            setFormError(err.data?.detail || 'Could not start the thread.')
        } finally {
            setSending(false)
        }
    }

    if (error) return <PageLayout title='Forums'><PageMessage title='Board not found' text='It may have been removed.' /></PageLayout>
    if (!board) return <PageLayout title='Forums'><PageMessage title='Loading...' /></PageLayout>

    return (
        <PageLayout
            title={board.name}
            subtitle={board.description}
            width='narrow'
            action={!writing && (
                <button type='button' onClick={openForm} className={`${BUTTON_STYLE} flex items-center gap-1.5`}>
                    <Plus className='h-4 w-4' /> New thread
                </button>
            )}
        >
            <p className='mb-4 text-sm'><Link to='/forums' className='text-gray-400 hover:text-white'>← All boards</Link></p>

            {writing && (
                <form onSubmit={handleSubmit} className='mb-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
                    <div>
                        <label htmlFor='thread-title' className={LABEL_STYLE}>Title</label>
                        <input id='thread-title' value={title} onChange={event => setTitle(event.target.value)} maxLength={150} className={INPUT_STYLE} />
                    </div>
                    <div>
                        <label htmlFor='thread-body' className={LABEL_STYLE}>Your message</label>
                        <textarea id='thread-body' rows={5} value={body} onChange={event => setBody(event.target.value)} maxLength={5000} className={INPUT_STYLE} />
                    </div>
                    {formError && <p className='text-sm text-red-400'>{formError}</p>}
                    <div className='flex justify-end gap-3'>
                        <button type='button' onClick={() => setWriting(false)} className='text-sm text-gray-400 hover:text-white'>Cancel</button>
                        <button type='submit' disabled={sending || !title.trim() || !body.trim()} className={BUTTON_STYLE}>
                            {sending ? 'Posting...' : 'Post thread'}
                        </button>
                    </div>
                </form>
            )}

            {board.threads.length === 0 && (
                <PageMessage title='No threads yet' text={user ? 'Start the first one!' : 'Log in to start the first one.'} />
            )}

            <ul className='divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40'>
                {board.threads.map(thread => (
                    <li key={thread.id}>
                        <Link to={`/forums/${slug}/${thread.id}`} className='flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-800/40'>
                            <span className='min-w-0 flex-1'>
                                <span className='flex items-center gap-2 font-semibold text-white'>
                                    {/* Icon AND text in the title attribute - not colour alone. */}
                                    {thread.is_pinned && <Pin className='h-4 w-4 shrink-0 text-amber-400' aria-label='Pinned' />}
                                    {thread.is_locked && <Lock className='h-4 w-4 shrink-0 text-gray-500' aria-label='Locked' />}
                                    <span className='truncate'>{thread.title}</span>
                                </span>
                                <span className='mt-0.5 block text-xs text-gray-500'>
                                    by {thread.author} · active {timeAgo(thread.last_activity)}
                                </span>
                            </span>
                            <span className='flex shrink-0 items-center gap-1 text-sm text-gray-400'>
                                <MessageSquare className='h-4 w-4' /> {thread.reply_count}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </PageLayout>
    )
}

export default BoardPage
