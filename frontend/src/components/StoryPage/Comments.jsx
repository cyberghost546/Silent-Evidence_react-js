import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getComments, postComment } from '../../api/client'
import { formatLongDate } from '../../utils/format'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import { Flag, Reply } from 'lucide-react'
import ReportDialog from '../ReportDialog/ReportDialog'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// The comment section: a box to write one, then the list -
// each comment with its replies underneath (CommentItem, below).
//
// Usage:
//   <Comments key={story.id} storyId={story.id} />
//
// Anyone can READ comments. Only logged-in users see the box -
// everyone else gets a "Log in to comment" link instead.
// ---------------------------------------------------------------
function Comments({ storyId }) {
    const { user } = useAuth()
    const location = useLocation()

    // null = loading, [] = none yet.
    const [comments, setComments] = useState(null)
    const [text, setText] = useState('')
    const [posting, setPosting] = useState(false)
    const [error, setError] = useState(null)

    // The id of the comment being reported (null = pop-up closed).
    const [reportingId, setReportingId] = useState(null)
    const requireLogin = useRequireLogin()

    function handleReport(commentId) {
        if (!requireLogin()) return   // logged out -> Log In page first
        setReportingId(commentId)
    }

    useEffect(() => {
        let ignore = false

        getComments(storyId)
            .then(data => {
                if (!ignore) setComments(data)
            })
            .catch(err => console.error('Could not load comments:', err))

        return () => {
            ignore = true
        }
    }, [storyId])

    async function handleSubmit(event) {
        event.preventDefault()
        setError(null)
        setPosting(true)

        try {
            const newComment = await postComment(storyId, text)

            // Put the new comment at the TOP of the list, without asking
            // Django for the whole list again.
            // [newComment, ...comments] = a NEW array: the new one,
            // then all the old ones copied in. Never .push() onto state -
            // React only notices a change when it gets a new array.
            setComments([newComment, ...comments])
            setText('')
        } catch (err) {
            // Django's reasons look like { body: ['This field may not be blank.'] }
            // ?. stops at the first missing piece instead of crashing.
            setError(err.data?.body?.[0] || err.data?.detail || 'Could not post your comment. Please try again.')
        } finally {
            setPosting(false)
        }
    }

    // A reply. Throws on failure, so the little reply box (CommentItem)
    // can show the error right where you typed.
    async function handleReply(parentId, body) {
        const newReply = await postComment(storyId, body, parentId)
        setComments([newReply, ...comments])
    }

    // The top comments = the ones that aren't a reply to something.
    const topComments = (comments ?? []).filter(comment => !comment.parent)

    return (
        <section className='mt-12'>
            <h2 className='text-2xl font-bold text-white'>
                Comments{' '}
                {comments && <span className='text-lg font-normal text-gray-500'>({comments.length})</span>}
            </h2>

            {/* ---------- WRITE ONE ---------- */}
            {user ? (
                <form onSubmit={handleSubmit} className='mt-5'>
                    <label htmlFor='comment' className='sr-only'>Write a comment</label>
                    <textarea
                        id='comment'
                        value={text}
                        onChange={event => setText(event.target.value)}
                        placeholder='Write a comment...'
                        rows={3}
                        maxLength={2000}
                        className={INPUT_STYLE}
                    />

                    {error && <p className='mt-2 text-sm text-red-400'>{error}</p>}

                    <div className='mt-3 flex justify-end'>
                        {/* Disabled while empty (spaces don't count) or posting. */}
                        <button
                            type='submit'
                            disabled={posting || text.trim() === ''}
                            className={BUTTON_STYLE}
                        >
                            {posting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </form>
            ) : (
                <p className='mt-5 rounded-lg border border-gray-800 bg-gray-950 px-4 py-4 text-sm text-gray-400'>
                    {/* state.from = come back to this story after logging in. */}
                    <Link to='/login' state={{ from: location.pathname }} className='font-semibold text-red-400 hover:text-red-300'>
                        Log in
                    </Link>{' '}
                    to join the conversation.
                </p>
            )}

            {/* ---------- THE LIST ---------- */}
            {comments === null && <p className='mt-6 text-sm text-gray-500'>Loading comments...</p>}

            {comments !== null && comments.length === 0 && (
                <p className='mt-6 text-sm text-gray-500'>No comments yet. Be the first!</p>
            )}

            {/* Only the TOP comments here (parent = null). Each one
                shows its own replies underneath (CommentItem). */}
            <ul className='mt-6 space-y-5'>
                {topComments.map(comment => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        // Django sends newest first; a conversation
                        // reads better oldest first, so .reverse().
                        replies={comments.filter(reply => reply.parent === comment.id).reverse()}
                        canReply={Boolean(user)}
                        onReport={handleReport}
                        onReply={body => handleReply(comment.id, body)}
                    />
                ))}
            </ul>

            {/* The Report pop-up, for whichever comment was clicked. */}
            {reportingId && (
                <ReportDialog target={{ comment_id: reportingId }} what='comment' onClose={() => setReportingId(null)} />
            )}
        </section>
    )
}

// ---------------------------------------------------------------
// ONE COMMENT, with its replies and a "Reply" box.
//
// It's in the same file because nothing else uses it. It calls
// itself for the replies (with no replies and no Reply button of
// their own - threads are only one level deep, see Comment.parent
// in Django).
// ---------------------------------------------------------------
function CommentItem({ comment, replies = [], canReply, onReport, onReply, isReply = false }) {
    // Is the reply box open? + what's typed in it.
    const [replying, setReplying] = useState(false)
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        setSending(true)
        setError('')
        try {
            await onReply(text)
            setText('')
            setReplying(false)
        } catch (err) {
            setError(err.data?.body?.[0] || err.data?.parent?.[0] || err.data?.detail || 'Could not post your reply.')
        } finally {
            setSending(false)
        }
    }

    return (
        <li className='flex gap-3'>
            {/* Replies get a smaller avatar. */}
            <span className={`flex shrink-0 items-center justify-center rounded-full bg-red-700 font-bold text-white ${isReply ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'}`}>
                {comment.author.slice(0, 2).toUpperCase()}
            </span>
            <div className='min-w-0 flex-1'>
                <p className='flex items-center gap-2 text-sm'>
                    <span className='font-semibold text-white'>{comment.author}</span>
                    <span className='text-gray-500'>&middot; {formatLongDate(comment.created_at)}</span>
                    {/* ml-auto = pushed to the right. Quiet grey
                        until you hover it. */}
                    <button
                        type='button'
                        onClick={() => onReport(comment.id)}
                        className='ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-red-400'
                        aria-label={`Report comment by ${comment.author}`}
                    >
                        <Flag className='h-3 w-3' />
                        Report
                    </button>
                </p>
                {/* break-words: a very long word/link wraps
                    instead of stretching the page sideways. */}
                <p className='mt-1 whitespace-pre-line break-words text-gray-300'>{comment.body}</p>

                {/* "Reply" - only on top comments, only when logged in. */}
                {!isReply && canReply && !replying && (
                    <button type='button' onClick={() => setReplying(true)} className='mt-1 flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-white'>
                        <Reply className='h-3.5 w-3.5' /> Reply
                    </button>
                )}

                {replying && (
                    <form onSubmit={handleSubmit} className='mt-3'>
                        <label htmlFor={`reply-${comment.id}`} className='sr-only'>Reply to {comment.author}</label>
                        <textarea
                            id={`reply-${comment.id}`}
                            value={text}
                            onChange={event => setText(event.target.value)}
                            placeholder={`Reply to ${comment.author}...`}
                            rows={2}
                            maxLength={2000}
                            autoFocus
                            className={`${INPUT_STYLE} text-sm`}
                        />
                        {error && <p className='mt-1 text-sm text-red-400'>{error}</p>}
                        <div className='mt-2 flex justify-end gap-3'>
                            <button type='button' onClick={() => { setReplying(false); setText('') }} className='text-sm text-gray-400 hover:text-white'>Cancel</button>
                            <button type='submit' disabled={sending || text.trim() === ''} className='rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50'>
                                {sending ? 'Sending...' : 'Reply'}
                            </button>
                        </div>
                    </form>
                )}

                {/* The replies: a thin line on the left shows they
                    belong to this comment. */}
                {replies.length > 0 && (
                    <ul className='mt-4 space-y-4 border-l border-gray-800 pl-4'>
                        {replies.map(reply => (
                            <CommentItem key={reply.id} comment={reply} isReply onReport={onReport} />
                        ))}
                    </ul>
                )}
            </div>
        </li>
    )
}

export default Comments
