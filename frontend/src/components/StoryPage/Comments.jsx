import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getComments, postComment } from '../../api/client'
import { formatLongDate } from '../../utils/format'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import { Flag } from 'lucide-react'
import ReportDialog from '../ReportDialog/ReportDialog'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// The comment section: a box to write one, then the list.
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

            <ul className='mt-6 space-y-5'>
                {comments?.map(comment => (
                    <li key={comment.id} className='flex gap-3'>
                        <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-700 text-xs font-bold text-white'>
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
                                    onClick={() => handleReport(comment.id)}
                                    className='ml-auto flex items-center gap-1 text-xs text-gray-600 hover:text-red-400'
                                    aria-label={`Report comment by ${comment.author}`}
                                >
                                    <Flag className='h-3 w-3' />
                                    Report
                                </button>
                            </p>
                            {/* break-words: a very long word/link wraps
                                instead of stretching the page sideways. */}
                            <p className='mt-1 whitespace-pre-line break-words text-gray-300'>{comment.body}</p>
                        </div>
                    </li>
                ))}
            </ul>

            {/* The Report pop-up, for whichever comment was clicked. */}
            {reportingId && (
                <ReportDialog target={{ comment_id: reportingId }} what='comment' onClose={() => setReportingId(null)} />
            )}
        </section>
    )
}

export default Comments
