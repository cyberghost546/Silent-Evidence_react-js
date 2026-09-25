import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { getFeed } from '../../api/client'
import Avatar from '../Avatar/Avatar'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import StoryGridCard from '../StorySections/StoryGridCard'
import { BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// MY FEED (/feed) - logged-in users only (App.jsx).
//
// Shows the newest stories from the authors YOU follow. Following
// happens on someone's profile page (the Follow button), or in the
// "Authors to Follow" row on the homepage.
//
// Django does the work (FeedView in backend/stories/views.py) and
// sends back:
//   following - the people you follow (for the avatar row)
//   stories   - their published stories, as story cards
//
// Three things can be on screen:
//   1. You follow nobody          -> "You're not following anyone yet."
//   2. You follow people, but they
//      haven't published anything -> "Nothing new yet."
//   3. Stories!                    -> a grid of story cards
// ---------------------------------------------------------------


// The two sort buttons. `value` is what we send to Django (?sort=...).
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most viewed' },
]


// ---------------------------------------------------------------
// The "nothing to show" box, with a message and some buttons.
// Written once, used for both empty cases below.
//
// Usage:
//   <FeedMessage title='...' text='...'>
//       <Link ...>A button</Link>
//   </FeedMessage>
// ---------------------------------------------------------------
function FeedMessage({ title, text, children }) {
    return (
        <div className='py-20 text-center'>
            <p className='text-lg text-gray-200'>{title}</p>
            <p className='mt-3 text-sm text-gray-500'>{text}</p>

            {/* flex-wrap: on a narrow phone the buttons go under
                each other instead of squashing. */}
            <div className='mt-6 flex flex-wrap items-center justify-center gap-4'>
                {children}
            </div>
        </div>
    )
}


function FeedPage() {
    const [sort, setSort] = useState('newest')

    // null = still loading. After that: { following: [...], stories: [...] }
    const [feed, setFeed] = useState(null)
    const [error, setError] = useState('')

    // Load the feed when the page opens, and again whenever you pick
    // another sort (because `sort` is in the [ ] list at the bottom).
    useEffect(() => {
        // The "ignore" trick (same as ProfilePage and Leaderboard):
        // if you switch sort quickly, an OLD answer that arrives late
        // is thrown away instead of replacing the new one.
        let ignore = false

        getFeed(sort)
            .then(data => {
                if (!ignore) setFeed(data)
            })
            .catch(() => {
                if (!ignore) setError('Could not load your feed. Is the Django server running?')
            })

        return () => {
            ignore = true
        }
    }, [sort])

    // Picking a sort. We keep the old stories on screen while the
    // new order loads (no "Loading..." flash for a simple re-sort).
    function changeSort(value) {
        setSort(value)
        setError('')
    }

    // Shortcuts, so the JSX below reads more easily.
    // feed?.following: feed is null while loading, ?. stops a crash.
    const following = feed?.following ?? []
    const stories = feed?.stories ?? []

    return (
        // Same dark blue as the Leaderboard page.
        <div className='min-h-screen bg-[#0f172a]'>
        <div className='mx-auto max-w-6xl px-4 py-12'>

            {/* ---------- TITLE ---------- */}
            {/* flex-wrap + justify-between: title on the left, sort
                buttons on the right - and under each other on phones. */}
            <div className='flex flex-wrap items-center justify-between gap-4'>
                <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                    {/* The red bar is just an empty span with a
                        width, height and colour (like SectionHeading). */}
                    <span className='h-8 w-1 rounded-full bg-red-600' />
                    My Feed
                </h1>

                {/* Sorting only makes sense when there ARE stories. */}
                {stories.length > 1 && (
                    <SegmentedControl label='Sort feed' options={SORT_OPTIONS} value={sort} onChange={changeSort} />
                )}
            </div>

            {/* ---------- WHO YOU FOLLOW ---------- */}
            {following.length > 0 && (
                <div className='mt-8'>
                    <p className='flex items-center gap-2 text-sm text-gray-400'>
                        <Users className='h-4 w-4' />
                        {/* "1 writer" but "2 writers". */}
                        You follow {following.length} {following.length === 1 ? 'writer' : 'writers'}
                    </p>

                    {/* overflow-x-auto: if you follow a LOT of people,
                        the row scrolls sideways instead of wrapping
                        onto many lines. pb-2 leaves room for the
                        scrollbar. */}
                    <div className='mt-3 flex gap-5 overflow-x-auto pb-2'>
                        {following.map(person => (
                            <Link
                                key={person.username}
                                to={`/profile/${person.username}`}
                                className='group flex w-16 shrink-0 flex-col items-center gap-2'
                            >
                                <Avatar username={person.username} image={person.avatar} size='md' />
                                {/* group-hover: turns white when the WHOLE
                                    link (the "group") is hovered, not just
                                    the text. truncate = "..." if too long. */}
                                <span className='w-full truncate text-center text-xs text-gray-400 group-hover:text-white'>
                                    {person.username}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ---------- THE STORIES (or a message) ---------- */}
            <div className='mt-8'>
                {error && (
                    <p className='rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300'>{error}</p>
                )}

                {!error && feed === null && (
                    <p className='py-20 text-center text-gray-400'>Loading your feed...</p>
                )}

                {/* Case 1: you follow nobody. */}
                {feed && following.length === 0 && (
                    <FeedMessage
                        title="You're not following anyone yet."
                        text="Visit an author's profile and click Follow to see their stories here."
                    >
                        <Link to='/' className={BUTTON_STYLE}>Discover stories</Link>
                        <Link to='/leaderboard' className='text-sm font-semibold text-gray-400 hover:text-white'>
                            See top writers →
                        </Link>
                    </FeedMessage>
                )}

                {/* Case 2: you follow people, but no stories yet. */}
                {feed && following.length > 0 && stories.length === 0 && (
                    <FeedMessage
                        title='Nothing new yet.'
                        text="The writers you follow haven't published a story yet. Check back soon."
                    >
                        <Link to='/leaderboard' className={BUTTON_STYLE}>Find more writers</Link>
                    </FeedMessage>
                )}

                {/* Case 3: stories! The same cards as the homepage
                    and the profile page. */}
                {stories.length > 0 && (
                    <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                        {stories.map(story => (
                            <StoryGridCard key={story.id} story={story} />
                        ))}
                    </div>
                )}
            </div>
        </div>
        </div>
    )
}

export default FeedPage
