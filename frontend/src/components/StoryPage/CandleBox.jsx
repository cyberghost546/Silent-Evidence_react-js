import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { getPaymentPlans, startCheckout } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { formatMoney } from '../../utils/format'
import SegmentedControl from '../SegmentedControl/SegmentedControl'


const MAX_MESSAGE = 200   // the same limit as Payment.message in Django


// ---------------------------------------------------------------
// "LIGHT A CANDLE" - a small tip for the writer, under the story.
//
//   <CandleBox storyId={story.id} writer={story.author} isAuthor={isAuthor} />
//
// Closed, it's one button. Open, you pick an amount (€1 / €3 / €5),
// add a note if you like, and go to the payment page - the same
// steps as buying Pro (see PremiumPage.jsx).
//
// The writer gets most of it; the site keeps a small part
// (SITE_CUT_PERCENT in backend/payments/prices.py) - we say so
// right in the box, so nobody feels tricked.
//
// Draws nothing on your own story, or when payments are off.
// ---------------------------------------------------------------
function CandleBox({ storyId, writer, isAuthor }) {
    const { user } = useAuth()
    const location = useLocation()
    const [info, setInfo] = useState(null)
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState('')
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        getPaymentPlans()
            .then(answer => {
                setInfo(answer)
                // Pick the middle candle to start with (€3).
                setAmount(answer.tip_amounts[1] ?? answer.tip_amounts[0])
            })
            .catch(() => setInfo(null))   // no box then - not worth an error
    }, [])

    if (isAuthor || !info || info.mode === 'off') return null

    async function handleSubmit(event) {
        event.preventDefault()
        setSending(true)
        setError('')
        try {
            const answer = await startCheckout({ kind: 'tip', story_id: storyId, amount, message })
            window.location.assign(answer.url)
        } catch (err) {
            setError(err.data?.detail || 'Something went wrong. Try again.')
            setSending(false)
        }
    }

    // --- Closed: just the button ---
    if (!open) {
        return (
            <button
                type='button'
                onClick={() => setOpen(true)}
                className='inline-flex items-center gap-2 rounded-full border border-amber-700/70 bg-amber-950/30 px-4 py-1.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-900/40'
            >
                <Flame className='h-4 w-4' />
                Light a candle for {writer}
            </button>
        )
    }

    // --- Open: the little form ---
    return (
        // basis-full: on its own line under the like/reaction buttons.
        <form onSubmit={handleSubmit} className='basis-full rounded-2xl border border-amber-800/60 bg-amber-950/20 p-5'>
            <p className='flex items-center gap-2 font-semibold text-amber-100'>
                <Flame className='h-5 w-5 text-amber-400' />
                Light a candle for {writer}
            </p>
            <p className='mt-1 text-sm text-gray-400'>
                A small thank-you that goes to the writer ({100 - info.site_cut_percent}% to them, {info.site_cut_percent}% keeps the site running).
            </p>

            {!user ? (
                <p className='mt-4 text-sm text-gray-300'>
                    <Link to='/login' state={{ from: location.pathname }} className='font-semibold text-red-400 underline'>Log in</Link> to light a candle.
                </p>
            ) : (
                <>
                    <div className='mt-4'>
                        <SegmentedControl
                            label='How big a candle'
                            value={amount}
                            onChange={setAmount}
                            options={info.tip_amounts.map(tip => ({ value: tip, label: formatMoney(tip, info.currency) }))}
                        />
                    </div>

                    <label htmlFor='candle-message' className='mt-4 block text-sm font-medium text-gray-300'>
                        A note for {writer} (optional)
                    </label>
                    <textarea
                        id='candle-message'
                        value={message}
                        onChange={event => setMessage(event.target.value.slice(0, MAX_MESSAGE))}
                        rows={2}
                        placeholder="I couldn't sleep after this one..."
                        className='mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-500 focus:outline-none'
                    />
                    <p className='text-right text-xs text-gray-500'>{message.length}/{MAX_MESSAGE}</p>

                    {info.mode === 'fake' && (
                        <p className='mt-2 text-xs text-amber-300'>Test mode - no real money.</p>
                    )}
                    {error && <p role='alert' className='mt-2 text-sm text-red-400'>{error}</p>}

                    <div className='mt-3 flex flex-wrap gap-3'>
                        <button
                            type='submit'
                            disabled={sending}
                            className='rounded-full bg-amber-700 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50'
                        >
                            {sending ? 'Opening the payment page...' : `Light it - ${formatMoney(amount, info.currency)}`}
                        </button>
                        <button
                            type='button'
                            onClick={() => setOpen(false)}
                            className='rounded-full border border-slate-600 px-5 py-2 text-sm text-gray-300 hover:border-slate-400'
                        >
                            Not now
                        </button>
                    </div>
                </>
            )}
        </form>
    )
}

export default CandleBox
