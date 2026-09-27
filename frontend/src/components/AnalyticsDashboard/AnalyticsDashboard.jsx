import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import { getAnalytics } from '../../api/client'
import SegmentedControl from '../SegmentedControl/SegmentedControl'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> ANALYTICS (/dashboard/analytics).
//
//   Tiles:  sign-ups, stories, comments, likes, logins in the period,
//           with up/down compared to the period before.
//           Click a tile to show it in the chart.
//   Chart:  one bar per day. Hover a bar to see the day + number.
//   Lists:  most-viewed stories and categories.
//
// The chart is plain <div>s - no chart library needed for bars.
// ---------------------------------------------------------------

const RANGES = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
]

// '2026-09-27' -> 'Sep 27'. The T12:00 avoids time-zone surprises
// (midnight UTC can be "yesterday" in some places).
function shortDate(isoDate) {
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}


// "+25%" / "-10%" / "new" compared to the period before.
// Arrow + text, so it doesn't rely on colour alone.
function Change({ total, previous }) {
    if (previous === 0) {
        return total > 0 ? <span className='text-xs text-gray-400'>new this period</span> : <span className='text-xs text-gray-500'>no change</span>
    }
    const percent = Math.round(((total - previous) / previous) * 100)
    if (percent === 0) return <span className='text-xs text-gray-500'>no change</span>
    const up = percent > 0
    return (
        <span className={`inline-flex items-center gap-0.5 text-xs ${up ? 'text-green-400' : 'text-amber-300'}`}>
            {up ? <ArrowUp className='h-3 w-3' /> : <ArrowDown className='h-3 w-3' />}
            {up ? '+' : ''}{percent}% vs before
        </span>
    )
}


function AnalyticsDashboard() {
    const [days, setDays] = useState(30)
    const [metric, setMetric] = useState('signups')
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    // The bar under the mouse (its index), or null.
    const [hovered, setHovered] = useState(null)

    useEffect(() => {
        let ignore = false
        getAnalytics(days)
            .then(result => {
                if (!ignore) setData(result)
            })
            .catch(() => setError('Could not load the analytics.'))
        return () => {
            ignore = true
        }
    }, [days])

    const series = data?.series[metric] ?? []
    const tile = data?.tiles.find(item => item.key === metric)
    // The tallest bar = full height. Math.max(1, ...) so an all-zero
    // period doesn't divide by zero.
    const highest = Math.max(1, ...series.map(point => point.count))
    // Show a date under every Nth bar, so labels don't overlap.
    const labelEvery = days <= 7 ? 1 : days <= 30 ? 5 : 15

    return (
        <div className='max-w-6xl'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
                <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                    <TrendingUp className='h-7 w-7 text-red-500' />
                    Analytics
                </h1>
                <SegmentedControl label='Time range' options={RANGES} value={days} onChange={setDays} />
            </div>
            {error && <p className='mt-4 text-sm text-red-400'>{error}</p>}

            {data && (
                <>
                    {/* ---------- TILES (click = show in chart) ---------- */}
                    <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
                        {data.tiles.map(item => (
                            <button
                                key={item.key}
                                type='button'
                                onClick={() => setMetric(item.key)}
                                aria-pressed={item.key === metric}
                                className={`rounded-xl border p-4 text-left transition-colors ${
                                    item.key === metric ? 'border-red-700 bg-slate-900' : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
                                }`}
                            >
                                <p className='text-sm text-gray-400'>{item.label}</p>
                                <p className='mt-1 text-2xl font-bold tabular-nums text-white'>{item.total}</p>
                                <Change total={item.total} previous={item.previous} />
                            </button>
                        ))}
                    </div>

                    {/* ---------- THE CHART ---------- */}
                    <section className='mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5'>
                        <div className='flex flex-wrap items-baseline justify-between gap-2'>
                            <h2 className='font-bold text-white'>{tile.label} per day</h2>
                            {/* The hover "tooltip": the day + number of the bar under the mouse. */}
                            <p className='h-5 text-sm text-gray-300' aria-live='polite'>
                                {hovered !== null && series[hovered] ? (
                                    <>{shortDate(series[hovered].date)}: <span className='font-semibold text-white'>{series[hovered].count}</span></>
                                ) : (
                                    // Nothing hovered: give the scale instead (there's no y-axis).
                                    <span className='text-gray-500'>Busiest day: {Math.max(0, ...series.map(point => point.count))} · hover a bar for its number</span>
                                )}
                            </p>
                        </div>

                        {/* The bars. items-end = bars grow up from the bottom. */}
                        <div className='mt-4 flex h-48 items-end gap-0.5 border-b border-slate-700' onMouseLeave={() => setHovered(null)}>
                            {series.map((point, index) => (
                                // The hover area is the whole column (easier to hit
                                // than a thin bar); the bar is drawn inside it.
                                <div
                                    key={point.date}
                                    onMouseEnter={() => setHovered(index)}
                                    title={`${shortDate(point.date)}: ${point.count}`}
                                    className='flex h-full flex-1 items-end'
                                >
                                    <div
                                        className={`w-full rounded-t-[3px] ${hovered === index ? 'bg-red-400' : 'bg-red-600'}`}
                                        // 0 = no bar at all (not a thin sliver).
                                        style={{ height: point.count === 0 ? 0 : `${(point.count / highest) * 100}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                        {/* Dates under the chart, every few bars. */}
                        <div className='mt-1 flex gap-0.5'>
                            {series.map((point, index) => (
                                <span key={point.date} className='flex-1 truncate text-[10px] text-gray-500'>
                                    {index % labelEvery === 0 ? shortDate(point.date) : ''}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* ---------- TOP LISTS ---------- */}
                    <div className='mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2'>
                        <section className='rounded-2xl border border-slate-800 bg-slate-900/40 p-5'>
                            <h2 className='font-bold text-white'>Most viewed stories</h2>
                            <p className='text-xs text-gray-500'>All time - views aren't stored per day.</p>
                            <ol className='mt-3 space-y-2'>
                                {data.top_stories.map((story, index) => (
                                    <li key={story.id} className='flex items-center gap-3 text-sm'>
                                        <span className='w-4 text-gray-500'>{index + 1}.</span>
                                        <Link to={`/stories/${story.id}`} className='min-w-0 flex-1 truncate text-gray-100 hover:text-red-400'>{story.title}</Link>
                                        <span className='tabular-nums text-gray-400'>{story.views} views</span>
                                    </li>
                                ))}
                                {data.top_stories.length === 0 && <li className='text-sm text-gray-500'>No stories yet.</li>}
                            </ol>
                        </section>
                        <section className='rounded-2xl border border-slate-800 bg-slate-900/40 p-5'>
                            <h2 className='font-bold text-white'>Top categories</h2>
                            <p className='text-xs text-gray-500'>By total views of their stories.</p>
                            <ol className='mt-3 space-y-2'>
                                {data.top_categories.map((category, index) => (
                                    <li key={category.slug} className='flex items-center gap-3 text-sm'>
                                        <span className='w-4 text-gray-500'>{index + 1}.</span>
                                        <Link to={`/category/${category.slug}`} className='min-w-0 flex-1 truncate text-gray-100 hover:text-red-400'>{category.name}</Link>
                                        <span className='tabular-nums text-gray-400'>{category.stories} stories · {category.views} views</span>
                                    </li>
                                ))}
                                {data.top_categories.length === 0 && <li className='text-sm text-gray-500'>No stories in categories yet.</li>}
                            </ol>
                        </section>
                    </div>
                </>
            )}
        </div>
    )
}

export default AnalyticsDashboard
