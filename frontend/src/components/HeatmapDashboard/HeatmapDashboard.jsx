import { useState, useEffect } from 'react'
import { Grid3x3 } from 'lucide-react'
import { getHeatmap } from '../../api/client'
import SegmentedControl from '../SegmentedControl/SegmentedControl'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> ACTIVITY HEATMAP (/dashboard/heatmap).
//
// A grid: 7 rows (Mon-Sun) x 24 columns (hours). The darker the red,
// the more happened in that hour. Use it to pick WHEN to publish,
// send the newsletter, or do maintenance (at the quietest time).
//
// Colours: ONE colour (red) from light to strong = "more". Empty
// boxes are grey, so 0 never looks like "a little". Hover a box
// for the exact number.
// ---------------------------------------------------------------

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Full class names (Tailwind only finds classes written out in full).
// Step 0 = nothing; steps 1-4 = more and more.
const STEPS = ['bg-slate-800/60', 'bg-red-950', 'bg-red-900', 'bg-red-700', 'bg-red-500']

const RANGES = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 365, label: 'Year' },
]

// Which of the 4 colour steps a number belongs to.
// Math.ceil: anything above 0 is at least step 1.
function stepFor(count, max) {
    if (count === 0) return 0
    return Math.ceil((count / max) * 4)
}

// 13 -> "13:00"
function hourText(hour) {
    return `${String(hour).padStart(2, '0')}:00`
}


function HeatmapDashboard() {
    const [metric, setMetric] = useState('comments')
    const [days, setDays] = useState(30)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        let ignore = false
        getHeatmap(metric, days)
            .then(result => {
                if (!ignore) setData(result)
            })
            .catch(() => setError('Could not load the heatmap.'))
        return () => {
            ignore = true
        }
    }, [metric, days])

    return (
        <div className='max-w-6xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Grid3x3 className='h-7 w-7 text-red-500' />
                Activity Heatmap
            </h1>
            <p className='mt-1 text-gray-400'>When is the site busy? Per weekday and hour{data && ` (${data.timezone} time)`}.</p>
            {error && <p className='mt-4 text-sm text-red-400'>{error}</p>}

            {/* The filters, in one row above the chart. */}
            <div className='mt-6 flex flex-wrap items-center gap-3'>
                <select value={metric} onChange={event => setMetric(event.target.value)} aria-label='What to count' className='rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white [color-scheme:dark]'>
                    {(data?.metrics ?? [{ value: 'comments', label: 'Comments' }]).map(item => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                </select>
                <SegmentedControl label='Time range' options={RANGES} value={days} onChange={setDays} />
            </div>

            {data && (
                <>
                    {/* The headline: total + busiest moment. */}
                    <p className='mt-6 text-sm text-gray-300'>
                        <span className='text-2xl font-bold text-white'>{data.total}</span> {data.label.toLowerCase()} in the last {data.days} days
                        {data.busiest && (
                            <> · busiest: <span className='font-semibold text-white'>{FULL_DAYS[data.busiest.day]}s around {hourText(data.busiest.hour)}</span> ({data.busiest.count})</>
                        )}
                    </p>

                    {/* overflow-x-auto: on a phone the grid scrolls sideways. */}
                    <div className='mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 p-4'>
                        {/* 1 column for the day names, 24 for the hours, 1 for the day totals. */}
                        <div className='grid min-w-[46rem] grid-cols-[3rem_repeat(24,minmax(0,1fr))_3rem] gap-[3px]'>
                            {/* Top row: an hour label every 3 hours. */}
                            <span />
                            {Array.from({ length: 24 }, (_, hour) => (
                                <span key={hour} className='text-center text-[10px] text-gray-500'>{hour % 3 === 0 ? hour : ''}</span>
                            ))}
                            <span className='text-right text-[10px] text-gray-500'>Total</span>

                            {/* One row per day. */}
                            {data.grid.map((row, day) => (
                                <div key={day} className='contents'>
                                    <span className='self-center text-xs text-gray-400'>{DAYS[day]}</span>
                                    {row.map((count, hour) => (
                                        <span
                                            key={hour}
                                            // title = the hover tooltip; aria-label = for screen readers.
                                            title={`${FULL_DAYS[day]} ${hourText(hour)}: ${count}`}
                                            aria-label={`${FULL_DAYS[day]} ${hourText(hour)}: ${count}`}
                                            className={`h-7 rounded-[3px] ${STEPS[stepFor(count, data.max)]} hover:ring-2 hover:ring-white/70`}
                                        />
                                    ))}
                                    {/* The day's total, in normal text colour. */}
                                    <span className='self-center text-right text-xs tabular-nums text-gray-300'>
                                        {row.reduce((sum, count) => sum + count, 0)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Legend: "Less [] [] [] [] [] More". */}
                        <div className='mt-4 flex items-center justify-end gap-1.5 text-[11px] text-gray-500'>
                            Less
                            {STEPS.map(step => <span key={step} className={`h-3 w-3 rounded-[2px] ${step}`} />)}
                            More {data.max > 0 && `(max ${data.max} in one hour)`}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default HeatmapDashboard
