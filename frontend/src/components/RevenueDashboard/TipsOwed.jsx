import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { getTipsOwed, markTipsPaidOut } from '../../api/client'


// ---------------------------------------------------------------
// TIPS (candles) on Dashboard -> Revenue.
//
// The money from candles arrives in the SITE's Stripe account. The
// writer's part (90%) is theirs - so this list shows what we still
// owe each writer. After sending it to them (bank transfer, PayPal...),
// click "Mark as paid out" and it leaves the list.
//
// (Later, Stripe Connect could send writers their part by itself.
// This is the simple by-hand version.)
//
//   <TipsOwed money={amount => formatMoney(amount, 'EUR')} />
// ---------------------------------------------------------------
function TipsOwed({ money }) {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    // The writer whose button is busy, or null.
    const [busyId, setBusyId] = useState(null)

    function load() {
        getTipsOwed()
            .then(setData)
            .catch(() => setError('Could not load the tips.'))
    }

    useEffect(load, [])

    async function handlePaidOut(row) {
        // confirm() = the browser's own OK/Cancel box. Simple, and
        // stops a mis-click from hiding money we still owe.
        if (!window.confirm(`Did you send ${row.writer} ${money(row.owed)}?`)) return
        setBusyId(row.writer_id)
        try {
            await markTipsPaidOut(row.writer_id)
            load()
        } catch {
            setError('Could not save that. Try again.')
        } finally {
            setBusyId(null)
        }
    }

    return (
        <section className='mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
            <h2 className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400'>
                <Flame className='h-4 w-4 text-amber-400' />
                Candles (tips)
            </h2>

            {error && <p role='alert' className='mt-3 text-sm text-red-400'>{error}</p>}

            {data && (
                <>
                    <p className='mt-3 text-sm text-gray-300'>
                        {data.tip_count} {data.tip_count === 1 ? 'candle' : 'candles'}, {money(data.tips_total)} in total.
                        The site's part: <span className='font-semibold text-white'>{money(data.site_cut_total)}</span>.
                    </p>

                    <h3 className='mt-5 text-sm font-semibold text-white'>Still to send to writers</h3>
                    {data.writers.length === 0 ? (
                        <p className='mt-2 text-sm text-gray-500'>Nothing owed - everyone has been paid.</p>
                    ) : (
                        <table className='mt-2 w-full text-sm'>
                            <tbody>
                                {data.writers.map(row => (
                                    <tr key={row.writer_id} className='border-t border-slate-800 first:border-t-0'>
                                        <td className='py-2 text-gray-200'>{row.writer}</td>
                                        <td className='py-2 text-gray-500'>{row.tips} {row.tips === 1 ? 'candle' : 'candles'}</td>
                                        <td className='py-2 text-right font-semibold tabular-nums text-white'>{money(row.owed)}</td>
                                        <td className='py-2 pl-4 text-right'>
                                            <button
                                                type='button'
                                                onClick={() => handlePaidOut(row)}
                                                disabled={busyId === row.writer_id}
                                                className='rounded-full border border-slate-600 px-3 py-1 text-xs text-gray-200 hover:border-slate-400 disabled:opacity-50'
                                            >
                                                Mark as paid out
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </section>
    )
}

export default TipsOwed
