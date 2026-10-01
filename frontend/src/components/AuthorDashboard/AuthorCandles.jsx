import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { getPaymentPlans, getTipsReceived } from '../../api/client'
import { formatMoney, formatShortDate } from '../../utils/format'
import Panel from '../Dashboard/Panel'


// ---------------------------------------------------------------
// CANDLES (tips) on the Author Dashboard: what readers gave you.
//
// Its own request, like AuthorTrends, so the 7/30-day switch at the
// top of the dashboard doesn't reload it.
//
//   earned  = all your candles, after the site's part
//   waiting = the part we haven't sent you yet (an admin pays it out
//             by hand and marks it on Dashboard -> Revenue)
// ---------------------------------------------------------------
function AuthorCandles() {
    const [tips, setTips] = useState(null)
    const [currency, setCurrency] = useState('EUR')

    useEffect(() => {
        getTipsReceived().then(setTips).catch(() => setTips(null))
        getPaymentPlans().then(info => setCurrency(info.currency)).catch(() => {})
    }, [])

    // Still loading, or it failed: show nothing rather than a broken box.
    if (!tips) return null

    return (
        <Panel title='Candles' subtitle='Tips from your readers'>
            <div className='grid grid-cols-3 gap-3 text-center'>
                <BigNumber label='Candles' value={tips.count} />
                <BigNumber label='Earned' value={formatMoney(tips.earned, currency)} />
                <BigNumber label='Still to send you' value={formatMoney(tips.waiting, currency)} />
            </div>

            {tips.recent.length === 0 ? (
                <p className='mt-6 text-center text-sm text-gray-500'>
                    No candles yet. Readers can light one under any of your stories.
                </p>
            ) : (
                <ul className='mt-5 space-y-3'>
                    {tips.recent.map(tip => (
                        <li key={tip.id} className='flex gap-3 border-b border-gray-800/60 pb-3 last:border-0 last:pb-0'>
                            <Flame className='mt-0.5 h-4 w-4 shrink-0 text-amber-400' aria-hidden='true' />
                            <div className='min-w-0'>
                                <p className='text-xs text-gray-500'>
                                    <span className='font-semibold text-gray-300'>{tip.from}</span>
                                    {` · ${formatMoney(tip.amount, currency)} on `}
                                    <Link to={`/stories/${tip.story_id}`} className='text-red-400 hover:text-red-300'>{tip.story_title}</Link>
                                    {` · ${formatShortDate(tip.paid_at)}`}
                                </p>
                                {tip.message && <p className='mt-1 text-sm text-gray-300'>"{tip.message}"</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <p className='mt-5 text-xs text-gray-500'>
                You get {100 - tips.site_cut_percent}% of every candle. For now we send your share by hand -{' '}
                <Link to='/support' className='text-red-400 underline'>tell us</Link> how you'd like to be paid.
            </p>
        </Panel>
    )
}


// One big number with a small label under it.
function BigNumber({ label, value }) {
    return (
        <div className='rounded-lg bg-gray-950/60 px-2 py-3'>
            <p className='text-lg font-bold text-white'>{value}</p>
            <p className='text-xs text-gray-500'>{label}</p>
        </div>
    )
}

export default AuthorCandles
