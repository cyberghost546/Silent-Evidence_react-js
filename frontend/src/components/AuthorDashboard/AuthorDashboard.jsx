import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Eye, Heart, Users, MessageSquare, BookOpen, PenLine, User, Settings, Feather,
} from 'lucide-react'
import { getAuthorStats } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import Panel from '../Dashboard/Panel'
import BarChart from '../Dashboard/BarChart'
import TopStoriesTable from './TopStoriesTable'
import AuthorTrends from './AuthorTrends'
import AuthorCandles from './AuthorCandles'
import { formatShortDate } from '../../utils/format'


// ---------------------------------------------------------------
// The colours for the 4 big number boxes. Written out in full so
// Tailwind can see the class names (see styles/accents.js).
// ---------------------------------------------------------------
const TILE_COLORS = {
    blue: { icon: 'bg-blue-500/15 text-blue-400', number: 'text-blue-400' },
    red: { icon: 'bg-red-500/15 text-red-400', number: 'text-red-400' },
    purple: { icon: 'bg-purple-500/15 text-purple-400', number: 'text-purple-400' },
    green: { icon: 'bg-green-500/15 text-green-400', number: 'text-green-400' },
}


// ---------------------------------------------------------------
// Small pieces, only used on this page. If another page needs one,
// move it to its own file (like TopStoriesTable).
// ---------------------------------------------------------------

// A BIG number box: coloured icon, big number, label.
//   <StatTile icon={Eye} value={1204} label='Total Views' color='blue' />
function StatTile({ icon: Icon, value, label, color }) {
    const colors = TILE_COLORS[color]

    return (
        <div className='rounded-xl border border-slate-800 bg-slate-900/70 p-5'>
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.icon}`}>
                <Icon className='h-4 w-4' />
            </span>
            <p className={`mt-4 text-3xl font-bold ${colors.number}`}>{value.toLocaleString()}</p>
            <p className='mt-1 text-xs text-gray-500'>{label}</p>
        </div>
    )
}

// A SMALL box for "in the last X days" numbers. A + in front when
// it's more than 0, so it reads like growth: "+3 new followers".
//   <MiniStat icon={Users} value={3} label='New followers' />
function MiniStat({ icon: Icon, value, label }) {
    return (
        <div className='flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3'>
            <Icon className='h-4 w-4 shrink-0 text-gray-500' />
            <div>
                <p className='font-bold text-white'>{value > 0 ? `+${value}` : 0}</p>
                <p className='text-xs text-gray-500'>{label}</p>
            </div>
        </div>
    )
}

// A shortcut box at the bottom of the page.
//   <QuickLink to='/write' icon={PenLine} title='New Story' text='Start writing' />
function QuickLink({ to, icon: Icon, title, text }) {
    return (
        <Link to={to} className='flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4 transition-colors hover:border-red-800'>
            <Icon className='h-4 w-4 text-gray-400' />
            <div>
                <p className='text-sm font-semibold text-white'>{title}</p>
                <p className='text-xs text-gray-500'>{text}</p>
            </div>
        </Link>
    )
}


// ---------------------------------------------------------------
// Turns Django's daily list into what BarChart wants:
//   [ { date: '2026-09-24', likes: 3, ... } ]  +  'likes'
//   -> [ { label: 'Sep 24', value: 3 } ]
// ---------------------------------------------------------------
function toChartData(daily, field) {
    return daily.map(day => ({
        // new Date('2026-09-24') would be read as UTC midnight, which
        // is still the 23rd in America. Adding T00:00 makes it LOCAL
        // midnight, so the label shows the right day everywhere.
        label: new Date(`${day.date}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: day[field],
    }))
}


// ---------------------------------------------------------------
// THE AUTHOR DASHBOARD (/author) - logged in only (App.jsx).
//
// How your own stories are doing. Everything comes from ONE request
// (GET /api/author/stats/?days=30), and it's sent again when you
// switch between "7 days" and "30 days".
//
// This is different from the ADMIN dashboard (/dashboard), which is
// about the whole site. This one is just about YOU.
// ---------------------------------------------------------------
function AuthorDashboard() {
    const { user } = useAuth()

    const [days, setDays] = useState(30)

    // null = still loading, 'error' = it failed, otherwise the data.
    const [stats, setStats] = useState(null)

    useEffect(() => {
        // The same "ignore" trick as on the profile page: switch from
        // 30 to 7 quickly, and the slow 30-day answer can't overwrite
        // the 7-day one.
        let ignore = false

        getAuthorStats(days)
            .then(data => { if (!ignore) setStats(data) })
            .catch(() => { if (!ignore) setStats('error') })

        return () => { ignore = true }
    }, [days])

    if (stats === null) {
        return <p className='py-24 text-center text-gray-500'>Loading your dashboard...</p>
    }

    if (stats === 'error') {
        return <p className='py-24 text-center text-red-400'>Could not load your stats. Is the Django server running?</p>
    }

    // Short names, so the JSX below stays readable.
    const { totals, period, status } = stats
    const isAuthor = status.published > 0

    return (
        <div className='bg-slate-950 px-4 py-10'>
            <div className='mx-auto max-w-6xl space-y-6'>

                {/* ========== HEADER ========== */}
                <div className='border-b border-slate-800 pb-6'>
                    <p className='text-xs font-bold uppercase tracking-widest text-red-400'>Author Dashboard</p>
                    <h1 className='mt-2 text-3xl font-bold text-white'>
                        Welcome back, <span className='text-red-500'>{user.username}</span>
                    </h1>
                    <p className='mt-1 text-sm text-gray-400'>Here's how your stories are performing.</p>
                </div>

                {/* ========== AUTHOR BANNER ========== */}
                {/* Two versions: already published, or not yet. */}
                <div className='flex items-center gap-4 rounded-xl border border-amber-800/60 bg-amber-950/20 px-5 py-4'>
                    <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-900/40 text-amber-400'>
                        <Feather className='h-5 w-5' />
                    </span>
                    {isAuthor ? (
                        <div>
                            <p className='font-bold text-white'>You're an Author</p>
                            <p className='text-sm text-gray-400'>
                                {totals.views.toLocaleString()} reads across your {status.published} published {status.published === 1 ? 'story' : 'stories'}.
                            </p>
                        </div>
                    ) : (
                        <div className='flex flex-1 flex-wrap items-center justify-between gap-3'>
                            <div>
                                <p className='font-bold text-white'>Become an Author</p>
                                <p className='text-sm text-gray-400'>Publish your first story and your numbers will show up here.</p>
                            </div>
                            <Link to='/write' className='rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700'>Write a story</Link>
                        </div>
                    )}
                </div>

                {/* ========== ALL-TIME NUMBERS ========== */}
                <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
                    <StatTile icon={Eye} value={totals.views} label='Total Views' color='blue' />
                    <StatTile icon={Heart} value={totals.likes} label='Total Likes' color='red' />
                    <StatTile icon={Users} value={totals.followers} label='Followers' color='purple' />
                    <StatTile icon={MessageSquare} value={totals.comments} label='Comments' color='green' />
                </div>

                {/* ========== LAST 7 / 30 DAYS ========== */}
                <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
                    <MiniStat icon={BookOpen} value={period.stories} label={`Published (last ${days} days)`} />
                    <MiniStat icon={Heart} value={period.likes} label='New likes' />
                    <MiniStat icon={Users} value={period.followers} label='New followers' />
                    <MiniStat icon={MessageSquare} value={period.comments} label='New comments' />
                </div>

                {/* ========== STORY STATUS ========== */}
                <div className='grid grid-cols-3 gap-4'>
                    {[
                        { label: 'Published', value: status.published },
                        { label: 'Drafts', value: status.drafts },
                        { label: 'Scheduled', value: status.scheduled },
                    ].map(item => (
                        <div key={item.label} className='rounded-xl border border-slate-800 bg-slate-900/70 py-4 text-center'>
                            <p className='text-2xl font-bold text-white'>{item.value}</p>
                            <p className='text-xs text-gray-500'>{item.label}</p>
                        </div>
                    ))}
                </div>

                {/* ========== CHARTS ========== */}
                <div className='flex items-center justify-between pt-2'>
                    <h2 className='text-sm font-semibold text-gray-400'>Charts</h2>
                    {/* Our reusable toggle. Changing `days` re-runs the
                        useEffect above, which fetches the new numbers. */}
                    <SegmentedControl
                        label='Chart period'
                        value={days}
                        onChange={setDays}
                        options={[
                            { value: 7, label: '7 days' },
                            { value: 30, label: '30 days' },
                        ]}
                    />
                </div>

                {/* The SAME Panel and BarChart as the admin dashboard -
                    just different data and colours. */}
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                    <Panel title='New Likes' subtitle={`Last ${days} days`}>
                        <BarChart data={toChartData(stats.daily, 'likes')} color='bg-red-500' />
                    </Panel>
                    <Panel title='New Followers' subtitle={`Last ${days} days`}>
                        <BarChart data={toChartData(stats.daily, 'followers')} color='bg-purple-500' />
                    </Panel>
                </div>

                <Panel title='New Comments' subtitle={`Last ${days} days`}>
                    <BarChart data={toChartData(stats.daily, 'comments')} color='bg-green-500' />
                </Panel>

                {/* ========== OVER TIME (12 weeks) ==========
                    Its own request, so the 7/30-day switch above
                    doesn't reload it. */}
                <AuthorTrends />

                {/* ========== CANDLES (tips from readers) ========== */}
                <AuthorCandles />

                {/* ========== TOP STORIES + RECENT COMMENTS ========== */}
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                    <Panel title='Top Stories' subtitle='Your 5 most-read stories' actionLabel='View profile' actionTo='/profile'>
                        <TopStoriesTable stories={stats.top_stories} />
                    </Panel>

                    <Panel title='Recent Comments' subtitle='What readers are saying'>
                        {stats.recent_comments.length === 0 ? (
                            <p className='py-6 text-center text-sm text-gray-500'>No comments yet.</p>
                        ) : (
                            <ul className='space-y-4'>
                                {stats.recent_comments.map(comment => (
                                    <li key={comment.id} className='border-b border-gray-800/60 pb-4 last:border-0 last:pb-0'>
                                        <p className='text-xs text-gray-500'>
                                            <span className='font-semibold text-gray-300'>{comment.author}</span>
                                            {' on '}
                                            <Link to={`/stories/${comment.story_id}`} className='text-red-400 hover:text-red-300'>{comment.story_title}</Link>
                                            {' · '}
                                            {formatShortDate(comment.created_at)}
                                        </p>
                                        {/* line-clamp-2 = at most 2 lines, then "..." */}
                                        <p className='mt-1 line-clamp-2 text-sm text-gray-300'>{comment.body}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>

                {/* ========== SHORTCUTS ========== */}
                <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
                    <QuickLink to='/write' icon={PenLine} title='New Story' text='Start writing' />
                    <QuickLink to='/profile' icon={User} title='My Profile' text='How readers see you' />
                    <QuickLink to='/settings' icon={Settings} title='Settings' text='Edit your account' />
                    <QuickLink to='/contact' icon={MessageSquare} title='Get help' text='Contact the team' />
                </div>
            </div>
        </div>
    )
}

export default AuthorDashboard
