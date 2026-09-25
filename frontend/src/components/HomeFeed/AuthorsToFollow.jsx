import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAuthors, followAuthor } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import { pluralize } from '../../utils/format'


// ---------------------------------------------------------------
// "AUTHORS TO FOLLOW" - a row of small author cards.
//
// The authors come from Django (GET /api/accounts/authors/): people
// with the most published stories. The Follow button really follows
// them (a Follow row in the database, see accounts/models.py).
//
// Usage:
//   <AuthorsToFollow />            -> 6 authors
//   <AuthorsToFollow limit={4} />  -> 4 authors
// ---------------------------------------------------------------
function AuthorsToFollow({ limit = 6 }) {
    const { user } = useAuth()
    const requireLogin = useRequireLogin()

    // null = still loading, [] = nobody has written a story yet.
    const [authors, setAuthors] = useState(null)

    // [user] in the list: fetch again after logging in or out, so the
    // Follow / Following buttons are right for whoever is looking.
    useEffect(() => {
        getAuthors(limit)
            .then(setAuthors)
            .catch(() => setAuthors([]))
    }, [limit, user])

    async function handleFollow(username) {
        // Logged out? This sends them to Log In and stops here.
        if (!requireLogin()) return

        try {
            const result = await followAuthor(username)

            // Update just the one author that was clicked. .map() makes
            // a new list; everyone else is copied over unchanged.
            setAuthors(list => list.map(author =>
                author.username === username
                    ? { ...author, is_following: result.following, follower_count: result.follower_count }
                    : author
            ))
        } catch (error) {
            console.error('Could not follow:', error)
        }
    }

    // Loading, or no authors yet: hide the whole row. An empty
    // "Authors to Follow" heading would look broken.
    if (!authors || authors.length === 0) return null

    return (
        <section>
            <h2 className='mb-3 text-xs font-bold uppercase tracking-widest text-gray-400'>Authors to Follow</h2>

            {/* overflow-x-auto: on a small screen the row scrolls
                sideways instead of squashing the cards. */}
            <div className='dropdown-scroll flex gap-3 overflow-x-auto pb-2'>
                {authors.map(author => {
                    const isMe = user && user.username === author.username

                    return (
                        // shrink-0 = don't squash me, scroll instead.
                        <div
                            key={author.username}
                            className='flex w-36 shrink-0 flex-col items-center rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 text-center'
                        >
                            {/* Avatar + name link to their profile page. */}
                            <Link to={`/profile/${author.username}`} className='flex w-full flex-col items-center'>
                                <span className='flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white ring-2 ring-red-900'>
                                    {author.username.slice(0, 2).toUpperCase()}
                                </span>

                                {/* truncate = one line, "..." if too long. w-full
                                    is needed so truncate knows where to cut. */}
                                <span className='mt-2 w-full truncate text-sm font-bold text-white hover:text-red-400'>{author.username}</span>
                            </Link>
                            <p className='text-xs text-gray-500'>{pluralize(author.story_count, 'story', 'stories')}</p>

                            {/* No button on your own card - you can't follow yourself. */}
                            {!isMe && (
                                <button
                                    type='button'
                                    onClick={() => handleFollow(author.username)}
                                    className={`mt-3 w-full rounded-md py-1 text-xs font-semibold transition-colors ${
                                        author.is_following
                                            ? 'border border-slate-600 text-gray-300 hover:border-red-600 hover:text-white'
                                            : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                                >
                                    {author.is_following ? 'Following' : 'Follow'}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

export default AuthorsToFollow
