import { useState, useEffect } from 'react'
import { Funnel } from 'lucide-react'
import { getFunnel } from '../../api/client'
import SegmentedControl from '../SegmentedControl/SegmentedControl'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> CONVERSION FUNNEL (/dashboard/funnel).
//
// Of the people who signed up (in the chosen period), how many
// took each next step? Every bar is a part of the bar above it:
//
//   Signed up            ████████████████████  40   100%
//   Set up their profile ████████████          24    60%   (60% of the step before)
//   Liked / commented    ███████               14    35%   (58% ...)
//   ...
//
// The bars are plain <div>s whose WIDTH is the percentage - no
// chart library needed. The biggest drop between two steps is
// marked, because that's where to improve the site first.
// Django: FunnelView in backend/dashboard/views.py.
// ---------------------------------------------------------------

const PERIODS = [
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days' },
    { value: 'all', label: 'All time' },
]


function FunnelDashboard() {
    const [days, setDays] = useState('30')
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        let ignore = false
        getFunnel(days)
            .then(result => {
                if (!ignore) setData(result)
            })
            .catch(() => {
                if (!ignore) setError('Could not load the funnel.')
            })
        return () => {
            ignore = true
        }
    }, [days])

    // String(data.days): Django sends 30 (a number) or 'all'.
    const loading = !data || String(data.days) !== days

    // The step (after the first) that keeps the SMALLEST share of the
    // step before it = the biggest drop-off.
    let worstKey = null
    if (!loading && data.steps[0].count > 0) {
        const later = data.steps.slice(1)
        const worst = later.reduce((lowest, step) => (step.percent_of_previous < lowest.percent_of_previous ? step : lowest), later[0])
        worstKey = worst.key
    }

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Funnel className='h-7 w-7 text-red-500' />
                Conversion Funnel
            </h1>
            <p className='mt-1 text-gray-400'>How far new members get - from signing up to publishing and going premium.</p>

            <div className='mt-6'>
                <SegmentedControl label='Signed up in the last' options={PERIODS} value={days} onChange={setDays} />
            </div>

            {error && <p className='mt-4 text-sm text-red-400'>{error}</p>}

            {loading ? (
                <p className='mt-8 text-gray-400'>Loading...</p>
            ) : data.steps[0].count === 0 ? (
                <p className='mt-8 rounded-xl border border-slate-800 py-12 text-center text-gray-500'>Nobody signed up in this period.</p>
            ) : (
                // <ol> = the steps are in order. Each row: label on the
                // left, bar in the middle, numbers on the right.
                <ol className='mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                    {data.steps.map((step, index) => (
                        <li key={step.key} className='grid grid-cols-[11rem_1fr_7rem] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-1'>
                            <span className='text-sm text-gray-300'>
                                <span className='mr-2 text-gray-500'>{index + 1}.</span>
                                {step.label}
                            </span>

                            {/* The grey track, and the red bar inside it.
                                width = percent of everyone who signed up.
                                A step with nobody gets NO bar - even a thin
                                sliver would suggest "a few people". But 1
                                person out of 500 (0% rounded) still gets a
                                sliver, because it isn't nobody. */}
                            <div
                                className='group relative h-7 rounded bg-slate-800'
                                title={`${step.count} people · ${step.percent_of_total}% of sign-ups · ${step.percent_of_previous}% of the step before`}
                            >
                                <div
                                    className='h-full rounded bg-red-600 transition-all duration-500 group-hover:bg-red-500'
                                    style={{ width: step.count === 0 ? '0%' : `${Math.max(step.percent_of_total, 1)}%` }}
                                />
                            </div>

                            <span className='text-right text-sm max-sm:text-left'>
                                <span className='font-bold text-white'>{step.count}</span>
                                <span className='ml-2 text-gray-400'>{step.percent_of_total}%</span>
                            </span>

                            {/* Under every bar except the first: how many of
                                the step before made it here. */}
                            {index > 0 && (
                                <p className={`col-start-2 -mt-3 text-xs max-sm:col-start-1 max-sm:mt-0 ${step.key === worstKey ? 'font-semibold text-amber-300' : 'text-gray-500'}`}>
                                    {step.percent_of_previous}% of the step before
                                    {step.key === worstKey && ' - biggest drop, the best place to improve'}
                                </p>
                            )}
                        </li>
                    ))}
                </ol>
            )}

            <p className='mt-4 text-xs text-gray-500'>
                Only members are counted - the site doesn't track visitors who never sign up.
                Hover a bar for the exact numbers.
            </p>
        </div>
    )
}

export default FunnelDashboard
