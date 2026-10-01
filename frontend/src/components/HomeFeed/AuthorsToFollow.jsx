import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { getAuthors } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import FollowButton from '../FollowButton/FollowButton'
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

    // null = still loading, [] = nobody has written a story yet.
    const [authors, setAuthors] = useState(null)

    // [user] in the list: fetch again after logging in or out, so the
    // Follow / Following buttons are right for whoever is looking.
    useEffect(() => {
        getAuthors(limit)
            .then(setAuthors)
            .catch(() => setAuthors([]))
    }, [limit, user])

    // FollowButton (components/FollowButton) does the following itself
    // and tells us the answer, so the phone row and the cards below
    // stay in step. Update just the one author that changed - .map()
    // makes a new list; everyone else is copied over unchanged.
    function handleFollowChange(username, result) {
        setAuthors(list => list.map(author =>
            author.username === username
                ? { ...author, is_following: result.following, follower_count: result.follower_count }
                : author
        ))
    }

    // Loading, or no authors yet: hide the whole row. An empty
    // "Authors to Follow" heading would look broken.
    if (!authors || authors.length === 0) return null

    return (
        <section>
            <h2 className='mb-3 text-xs font-bold uppercase tracking-widest text-gray-400'>Authors to Follow</h2>

            {/* ---------- PHONES: the "stories" row ---------- */}
            {/* Round avatars with a red ring, names underneath - the row
                at the top of Instagram or Facebook. Tap one = their
                profile. sm:hidden = phones only.
                -mx-4 px-4: the row runs to the screen edges, so a cut-off
                circle at the end shows "swipe for more". */}
            {/* pb-2: room under the Follow buttons, so the scrolling row
                doesn't clip their bottom edge. */}
            <div className='scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:hidden'>
                {/* First circle: write your own story (like the "You +"
                    circle in social apps). */}
                <Link to='/write' className='flex w-20 shrink-0 flex-col items-center gap-1.5'>
                    <span className='flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-600 text-gray-300'>
                        <Plus className='h-6 w-6' />
                    </span>
                    <span className='text-xs text-gray-400'>Write</span>
                </Link>

                {authors.map(author => (
                    <Link
                        key={author.username}
                        to={`/profile/${author.username}`}
                        // w-20 = 80px: room for the name AND "Following".
                        className='flex w-20 shrink-0 flex-col items-center gap-1.5'
                    >
                        {/* The ring: a gradient circle (p-[3px] thick) with
                            the avatar on top. Featured writers get a gold
                            ring, everyone else red. The dark border
                            (border-slate-950) is the thin gap between the
                            ring and the avatar. */}
                        <span className={`rounded-full p-[3px] ${
                            author.is_featured
                                ? 'bg-linear-to-tr from-yellow-500 to-amber-300'
                                : 'bg-linear-to-tr from-red-700 to-red-400'
                        }`}>
                            <span className='flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-slate-950 bg-red-600 text-sm font-bold text-white'>
                                {author.username.slice(0, 2).toUpperCase()}
                            </span>
                        </span>

                        {/* w-full + truncate: long names end in "..." */}
                        <span className='w-full truncate text-center text-xs text-gray-300'>{author.username}</span>

                        {/* Follow right from the row. It's inside the link
                            to the profile, but FollowButton stops the tap
                            from opening the profile. key: start fresh when
                            the answer changes (so the cards and this row
                            always agree). */}
                        <FollowButton
                            key={`${author.username}-${author.is_following}`}
                            username={author.username}
                            following={author.is_following}
                            size='compact'
                            onChange={result => handleFollowChange(author.username, result)}
                        />
                    </Link>
                ))}
            </div>

            {/* ---------- TABLETS AND UP: the cards with Follow ---------- */}
            {/* overflow-x-auto: on a small screen the row scrolls
                sideways instead of squashing the cards.
                hidden sm:flex = not on phones (they get the row above). */}
            <div className='dropdown-scroll hidden gap-3 overflow-x-auto pb-2 sm:flex'>
                {authors.map(author => {
                    return (
                        // shrink-0 = don't squash me, scroll instead.
                        <div
                            key={author.username}
                            // Featured writers get a gold-ish border.
                            className={`flex w-36 shrink-0 flex-col items-center rounded-xl border bg-slate-900/60 p-4 text-center ${
                                author.is_featured ? 'border-yellow-700/60' : 'border-slate-700/60'
                            }`}
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

                            {/* Featured writers (Admin Dashboard -> Featured
                                Authors) get the admins' one-liner. line-clamp-2
                                = at most 2 lines, then "...". */}
                            {author.is_featured && author.featured_blurb && (
                                <p className='mt-1 line-clamp-2 text-[11px] italic text-yellow-300/90'>{author.featured_blurb}</p>
                            )}

                            {/* mt-3 w-full: the button fills the bottom of the card.
                                (No button on your own card - FollowButton hides itself.) */}
                            <div className='mt-3 flex w-full justify-center'>
                                <FollowButton
                                    key={`${author.username}-${author.is_following}`}
                                    username={author.username}
                                    following={author.is_following}
                                    size='small'
                                    onChange={result => handleFollowChange(author.username, result)}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

export default AuthorsToFollow
