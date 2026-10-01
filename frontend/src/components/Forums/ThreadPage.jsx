import { useState } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { Pin, Lock, EyeOff, Eye, Trash2 } from 'lucide-react'
import { getThread, replyToThread, moderateThread, deleteThread, setPostHidden } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatLongDate } from '../../utils/format'
import Avatar from '../Avatar/Avatar'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'
import SpoilerText from '../SpoilerText/SpoilerText'


// ---------------------------------------------------------------
// ONE THREAD (/forums/:slug/:id) - the first message, the replies,
// and a reply box for members.
// Admins also get Pin / Lock / Delete, and Hide on each reply
// (hidden replies stay visible to admins, greyed out, to undo).
// ---------------------------------------------------------------

// One message: the opening post and every reply look the same.
function Message({ author, avatar, createdAt, body, hidden = false, children }) {
    return (
        <article className={`rounded-2xl border p-5 ${hidden ? 'border-dashed border-slate-700 opacity-50' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className='flex items-center gap-3'>
                <Avatar username={author} image={avatar} />
                <p className='text-sm'>
                    <Link to={`/profile/${author}`} className='font-semibold text-white hover:text-red-400'>{author}</Link>
                    <span className='text-gray-500'> · {formatLongDate(createdAt)}</span>
                    {hidden && <span className='ml-2 text-xs text-amber-300'>(hidden)</span>}
                </p>
                {/* Admin buttons go on the right. */}
                <div className='ml-auto flex gap-2'>{children}</div>
            </div>
            {/* whitespace-pre-line keeps the line breaks people typed. */}
            <p className='mt-3 whitespace-pre-line break-words text-gray-200'><SpoilerText text={body} /></p>
        </article>
    )
}


function ThreadPage() {
    const { slug, id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()
    const { data: thread, error, reload, setData } = useApi(() => getThread(id), [id])
    usePageTitle(thread?.title ?? 'Forums')

    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [replyError, setReplyError] = useState('')

    async function handleReply(event) {
        event.preventDefault()
        setSending(true)
        setReplyError('')
        try {
            const post = await replyToThread(id, text.trim())
            // Add it at the end without loading the whole thread again.
            setData({ ...thread, posts: [...thread.posts, post] })
            setText('')
        } catch (err) {
            setReplyError(err.data?.detail || 'Could not post your reply.')
        } finally {
            setSending(false)
        }
    }

    // ---------- admin actions ----------
    async function toggle(field) {
        await moderateThread(id, { [field]: !thread[field] })
        reload()
    }

    async function handleDelete() {
        if (!window.confirm('Delete this whole thread and every reply?')) return
        await deleteThread(id)
        navigate(`/forums/${slug}`)
    }

    async function toggleHidden(post) {
        await setPostHidden(post.id, !post.is_hidden)
        reload()
    }

    if (error) return <PageLayout title='Forums'><PageMessage title='Thread not found' text='It may have been deleted.' /></PageLayout>
    if (!thread) return <PageLayout title='Forums'><PageMessage title='Loading...' /></PageLayout>

    const isAdmin = user?.is_staff
    const ADMIN_BUTTON = 'flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-gray-400 hover:border-slate-500 hover:text-white'

    return (
        <PageLayout title={thread.title} width='narrow'>
            <p className='mb-4 flex flex-wrap items-center gap-3 text-sm'>
                <Link to={`/forums/${thread.board.slug}`} className='text-gray-400 hover:text-white'>← {thread.board.name}</Link>
                {thread.is_pinned && <span className='flex items-center gap-1 text-amber-400'><Pin className='h-4 w-4' /> Pinned</span>}
                {thread.is_locked && <span className='flex items-center gap-1 text-gray-400'><Lock className='h-4 w-4' /> Locked</span>}
            </p>

            <div className='space-y-4'>
                {/* The opening message. */}
                <Message author={thread.author} avatar={thread.avatar} createdAt={thread.created_at} body={thread.body}>
                    {isAdmin && (
                        <>
                            <button type='button' onClick={() => toggle('is_pinned')} className={ADMIN_BUTTON}><Pin className='h-3.5 w-3.5' />{thread.is_pinned ? 'Unpin' : 'Pin'}</button>
                            <button type='button' onClick={() => toggle('is_locked')} className={ADMIN_BUTTON}><Lock className='h-3.5 w-3.5' />{thread.is_locked ? 'Unlock' : 'Lock'}</button>
                            <button type='button' onClick={handleDelete} className={`${ADMIN_BUTTON} hover:border-red-700 hover:text-red-400`}><Trash2 className='h-3.5 w-3.5' />Delete</button>
                        </>
                    )}
                </Message>

                {/* The replies. */}
                {thread.posts.map(post => (
                    <Message key={post.id} author={post.author} avatar={post.avatar} createdAt={post.created_at} body={post.body} hidden={post.is_hidden}>
                        {isAdmin && (
                            <button type='button' onClick={() => toggleHidden(post)} className={ADMIN_BUTTON}>
                                {post.is_hidden ? <><Eye className='h-3.5 w-3.5' />Show</> : <><EyeOff className='h-3.5 w-3.5' />Hide</>}
                            </button>
                        )}
                    </Message>
                ))}
            </div>

            {/* ---------- REPLY ---------- */}
            <div className='mt-8'>
                {thread.is_locked ? (
                    <p className='rounded-xl border border-slate-800 px-4 py-3 text-sm text-gray-400'>This thread is locked - no new replies.</p>
                ) : user ? (
                    <form onSubmit={handleReply}>
                        <label htmlFor='reply' className='sr-only'>Your reply</label>
                        <textarea id='reply' rows={4} value={text} onChange={event => setText(event.target.value)} maxLength={5000} placeholder='Write a reply... (put ||spoilers|| between two bars)' className={INPUT_STYLE} />
                        {replyError && <p className='mt-2 text-sm text-red-400'>{replyError}</p>}
                        <div className='mt-3 flex justify-end'>
                            <button type='submit' disabled={sending || !text.trim()} className={BUTTON_STYLE}>{sending ? 'Posting...' : 'Post reply'}</button>
                        </div>
                    </form>
                ) : (
                    <p className='rounded-xl border border-slate-800 px-4 py-3 text-sm text-gray-400'>
                        <Link to='/login' state={{ from: location.pathname }} className='font-semibold text-red-400 hover:text-red-300'>Log in</Link> to join the conversation.
                    </p>
                )}
            </div>
        </PageLayout>
    )
}

export default ThreadPage
