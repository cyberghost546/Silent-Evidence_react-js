import { useState, useEffect } from 'react'
import { DollarSign } from 'lucide-react'
import { getRevenue } from '../../api/client'
import { formatMoney } from '../../utils/format'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> REVENUE (/dashboard/revenue).
//
// Money from premium memberships (recorded on Premium Members):
//   - 4 number boxes: this month, last month, all time, premium now
//   - a bar per month for the last 12 months
//   - which plans brought in the most
// Cancelled memberships and gifts don't count.
//
// The chart is plain <div>s: each bar's HEIGHT is its share of the
// biggest month. Hover a bar for the exact amount.
// ---------------------------------------------------------------

function StatBox({ label, value, hint }) {
    return (
        <div className='rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4'>
            <p className='text-sm text-gray-400'>{label}</p>
            <p className='mt-1 text-2xl font-bold tabular-nums text-white'>{value}</p>
            {hint && <p className='mt-0.5 text-xs text-gray-500'>{hint}</p>}
        </div>
    )
}


function RevenueDashboard() {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        getRevenue()
            .then(result => setData(result))
            .catch(() => setError('Could not load the revenue.'))
    }, [])

    if (!data) return <p className='text-gray-400'>{error || 'Loading...'}</p>

    const money = amount => formatMoney(amount, data.currency)

    // The tallest bar = the best month. Math.max(...list) needs the
    // numbers "spread out" as separate arguments (the ...). The 1 is
    // there so an empty year doesn't divide by zero.
    const highest = Math.max(1, ...data.months.map(month => Number(month.total)))

    // Up or down compared with last month?
    const change = Number(data.this_month) - Number(data.last_month)

    return (
        <div className='max-w-5xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <DollarSign className='h-7 w-7 text-green-400' />
                Revenue
            </h1>
            <p className='mt-1 text-gray-400'>Money from premium memberships.</p>

            <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <StatBox
                    label='This month'
                    value={money(data.this_month)}
                    hint={change === 0 ? 'same as last month' : `${change > 0 ? '▲' : '▼'} ${money(Math.abs(change))} vs last month`}
                />
                <StatBox label='Last month' value={money(data.last_month)} />
                <StatBox label='All time' value={money(data.total_all_time)} />
                <StatBox label='Premium members now' value={data.active_premium} />
            </div>

            {/* ---------- 12 MONTHS ---------- */}
            <section className='mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <h2 className='text-sm font-semibold uppercase tracking-wider text-gray-400'>Last 12 months</h2>

                {/* items-end: every bar grows UP from the same bottom line.
                    h-56 = the height of the tallest possible bar. */}
                <div className='mt-6 flex h-56 items-end gap-2 border-b border-slate-700'>
                    {data.months.map(month => {
                        const percent = (Number(month.total) / highest) * 100
                        return (
                            // Each column fills the height, with the bar at the bottom.
                            <div key={month.key} className='group flex h-full flex-1 flex-col justify-end' title={`${month.label}: ${money(month.total)} (${month.count} ${month.count === 1 ? 'payment' : 'payments'})`}>
                                {/* The amount appears above the bar on hover. */}
                                <span className='mb-1 text-center text-[10px] tabular-nums text-gray-300 opacity-0 transition-opacity group-hover:opacity-100'>
                                    {money(month.total)}
                                </span>
                                {/* rounded-t = only the top corners round (the
                                    bar stands on the line). A month with 0 has
                                    no bar at all, not a sliver. */}
                                <div
                                    className='rounded-t bg-green-500 transition-colors group-hover:bg-green-400'
                                    style={{ height: Number(month.total) > 0 ? `${Math.max(percent, 2)}%` : '0' }}
                                />
                            </div>
                        )
                    })}
                </div>
                {/* The month names, lined up under the bars. */}
                <div className='mt-2 flex gap-2'>
                    {data.months.map(month => (
                        <span key={month.key} className='flex-1 text-center text-[10px] text-gray-500'>{month.label}</span>
                    ))}
                </div>
            </section>

            {/* ---------- PER PLAN ---------- */}
            <section className='mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <h2 className='text-sm font-semibold uppercase tracking-wider text-gray-400'>By plan (all time)</h2>
                {data.by_plan.length === 0 ? (
                    <p className='mt-3 text-sm text-gray-500'>No paid memberships yet. Record them on the Premium Members page.</p>
                ) : (
                    <table className='mt-3 w-full text-sm'>
                        <tbody>
                            {data.by_plan.map(row => (
                                <tr key={row.plan} className='border-t border-slate-800 first:border-t-0'>
                                    <td className='py-2 capitalize text-gray-200'>{row.plan}</td>
                                    <td className='py-2 text-gray-500'>{row.count} {row.count === 1 ? 'payment' : 'payments'}</td>
                                    <td className='py-2 text-right font-semibold tabular-nums text-white'>{money(row.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    )
}

export default RevenueDashboard
