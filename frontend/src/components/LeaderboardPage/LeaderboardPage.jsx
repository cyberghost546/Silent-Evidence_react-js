import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { getLeaderboard } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../Avatar/Avatar'
import EmptyState from '../StorySections/EmptyState'
import styles from './LeaderboardPage.module.css'


// ---------------------------------------------------------------
// THE LEADERBOARD PAGE (/leaderboard) - anyone can see it.
//
// Two tabs:
//   All Writers    - everyone with a published story
//   Elite Members  - only writers with 10+ published stories
//
// Django does all the counting and ranking (LeaderboardView in
// backend/accounts/views.py). This page only asks for the list and
// draws one row per writer.
// ---------------------------------------------------------------


// The tabs, as data. `value` is what we send to Django (?tab=...).
// Adding a tab = adding a line here AND handling it in Django.
const TABS = [
    { value: 'all', label: 'All Writers' },
    { value: 'elite', label: 'Elite Members' },
]

// A short line under the tabs, explaining what you're looking at.
// The "10" must match ELITE_MIN_STORIES in accounts/views.py.
const TAB_INFO = {
    all: 'Every writer with at least one published story.',
    elite: 'Writers with 10 or more published stories.',
}

// Places 1, 2 and 3 get a medal colour. Everyone else is grey.
// An object used like a lookup table: RANK_COLORS[1] -> gold.
const RANK_COLORS = {
    1: 'text-yellow-400',   // gold
    2: 'text-gray-300',     // silver
    3: 'text-orange-400',   // bronze
}


// ---------------------------------------------------------------
// One small number with a label under it: "0 / likes".
//
// Usage:
//   <Stat value={12} label='likes' />
// ---------------------------------------------------------------
function Stat({ value, label }) {
    return (
        // w-16 = every Stat is the same width, so the numbers line up
        // in neat columns from row to row.
        <div className='w-16 text-center'>
            {/* toLocaleString() adds commas: 12345 -> "12,345". */}
            <p className='font-bold text-white'>{value.toLocaleString()}</p>
            <p className='text-xs text-gray-500'>{label}</p>
        </div>
    )
}


// ---------------------------------------------------------------
// One writer on the leaderboard.
//
// Props:
//   writer - one item from Django's list:
//            { rank, username, avatar, story_count, follower_count,
//              total_likes, total_views, is_elite }
//   isMe   - true if it's the logged-in user (gets a red border)
// ---------------------------------------------------------------
function LeaderboardRow({ writer, isMe }) {
    // "1 story" but "2 stories" - the little s matters.
    const storyWord = writer.story_count === 1 ? 'story' : 'stories'
    const followerWord = writer.follower_count === 1 ? 'follower' : 'followers'

    // Two complete class lists (never a red class on top of a grey
    // one - see the comment in UserMenu.jsx).
    const boxStyle = isMe
        ? 'border-red-700 bg-red-950/20'
        : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'

    return (
        // The whole row is a link to their profile.
        <Link
            to={`/profile/${writer.username}`}
            className={`flex items-center gap-3 rounded-xl border px-4 py-4 transition-colors sm:gap-5 sm:px-8 ${boxStyle}`}
        >
            {/* ---------- RANK: #1, #2... ---------- */}
            {/* ?? 'text-gray-500': when the rank isn't 1, 2 or 3,
                RANK_COLORS[rank] is undefined, so use grey instead. */}
            <span className={`w-7 shrink-0 font-bold sm:w-8 ${RANK_COLORS[writer.rank] ?? 'text-gray-500'}`}>
                #{writer.rank}
            </span>

            <Avatar username={writer.username} image={writer.avatar} size='md' />

            {/* ---------- NAME + SMALL LINE ---------- */}
            {/* flex-1 = take all the space in the middle.
                min-w-0 + truncate = a very long username gets "..."
                instead of pushing the numbers off the screen. */}
            <div className='min-w-0 flex-1'>
                <p className='flex items-center gap-2 text-lg font-bold text-white'>
                    <span className='truncate'>{writer.username}</span>

                    {writer.is_elite && (
                        // title = the little tooltip when you hover.
                        // It's on a <span> because icons don't show one.
                        <span title='Elite Member' className='shrink-0'>
                            <Crown className='h-4 w-4 text-yellow-400' aria-label='Elite Member' />
                        </span>
                    )}

                    {isMe && (
                        <span className='shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white'>
                            You
                        </span>
                    )}
                </p>
                <p className='text-sm text-gray-400'>
                    {writer.story_count} {storyWord} · {writer.follower_count} {followerWord}
                </p>
            </div>

            {/* ---------- THE NUMBERS ---------- */}
            <div className='flex shrink-0'>
                <Stat value={writer.total_likes} label={writer.total_likes === 1 ? 'like' : 'likes'} />
                {/* Views are hidden on phones - there's no room. */}
                <div className='hidden sm:block'>
                    <Stat value={writer.total_views} label={writer.total_views === 1 ? 'view' : 'views'} />
                </div>
            </div>
        </Link>
    )
}


// ---------------------------------------------------------------
// THE PAGE
// ---------------------------------------------------------------
function LeaderboardPage() {
    const { user } = useAuth()

    const [tab, setTab] = useState('all')

    // null = still loading. [] = loaded, but nobody on it.
    const [writers, setWriters] = useState(null)
    const [error, setError] = useState('')

    // Runs when the page opens AND every time you switch tabs,
    // because `tab` is in the [ ] list at the bottom.
    useEffect(() => {
        // The "ignore" trick (same as ProfilePage): if you click the
        // other tab before the first answer arrives, the OLD answer
        // could come back last and show the wrong list. When the tab
        // changes, React runs the cleanup below, which sets ignore to
        // true - so the old answer is thrown away.
        let ignore = false

        getLeaderboard(tab)
            .then(data => {
                if (!ignore) setWriters(data)
            })
            .catch(() => {
                if (!ignore) setError('Could not load the leaderboard. Is the Django server running?')
            })

        return () => {
            ignore = true
        }
    }, [tab])

    // Clicking a tab. Besides changing the tab, empty the list, so
    // "Loading..." shows instead of the OLD tab's writers.
    // (Done here in the click, not in the effect above: React's rules
    // say an effect shouldn't set state straight away.)
    function changeTab(value) {
        if (value === tab) return
        setTab(value)
        setWriters(null)
        setError('')
    }

    return (
        <div className='min-h-screen bg-[#0f172a]'>

            {/* ---------- THE DARK TOP BAND ---------- */}
            {/* styles.hero = the red glow (LeaderboardPage.module.css). */}
            <div className={`${styles.hero} border-b border-slate-800 px-4 py-16 text-center`}>
                <h1 className='text-4xl font-bold text-white sm:text-5xl'>Leaderboard</h1>
                <p className='mt-3 text-gray-300'>Top authors ranked by total likes</p>
            </div>

            <div className='mx-auto max-w-4xl px-4 py-12'>

                {/* ---------- TABS ---------- */}
                {/* border-b on the row = the long grey line.
                    Each tab button has its own border-b-2 that sits
                    ON that line (-mb-px pulls it down 1px to overlap):
                    red when selected, see-through when not. */}
                <div role='tablist' className='flex gap-2 border-b border-slate-700'>
                    {TABS.map(item => {
                        const isSelected = item.value === tab

                        return (
                            <button
                                key={item.value}
                                type='button'
                                role='tab'
                                aria-selected={isSelected}
                                onClick={() => changeTab(item.value)}
                                className={`-mb-px border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                                    isSelected
                                        ? 'border-red-600 text-white'
                                        : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                            >
                                {item.label}
                            </button>
                        )
                    })}
                </div>

                <p className='mt-4 text-sm text-gray-500'>{TAB_INFO[tab]}</p>

                {/* ---------- THE LIST ---------- */}
                <div className='mt-6'>
                    {error && (
                        <p className='rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300'>{error}</p>
                    )}

                    {!error && writers === null && (
                        <p className='text-gray-400'>Loading the leaderboard...</p>
                    )}

                    {writers?.length === 0 && (
                        <EmptyState
                            title={tab === 'elite' ? 'No Elite Members yet' : 'No writers yet'}
                            message='Publish stories to climb the leaderboard.'
                        />
                    )}

                    {writers?.length > 0 && (
                        // space-y-3 = a gap between every row.
                        <ol className='space-y-3'>
                            {writers.map(writer => (
                                <li key={writer.username}>
                                    {/* user?.username: user is null when
                                        logged out, and ?. stops that crashing. */}
                                    <LeaderboardRow writer={writer} isMe={user?.username === writer.username} />
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LeaderboardPage
