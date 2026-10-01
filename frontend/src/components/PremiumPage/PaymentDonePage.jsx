import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Crown, Flame } from 'lucide-react'
import { getPayment } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import PageLayout from '../PageLayout/PageLayout'


// How often we ask "paid yet?", and how many times before giving up.
const CHECK_EVERY_MS = 2000
const MAX_CHECKS = 15   // 15 x 2 seconds = 30 seconds


// ---------------------------------------------------------------
// AFTER PAYING (/payment/done/<id>) - Stripe sends the browser here.
//
// Landing here does NOT mean it's paid! (Anyone can type this URL.)
// Stripe tells Django separately, through the webhook - usually a
// second or two later. So this page asks Django "is payment <id>
// paid yet?" every 2 seconds until it says yes.
// ---------------------------------------------------------------
function PaymentDonePage() {
    const { id } = useParams()
    const { refreshUser } = useAuth()
    const [payment, setPayment] = useState(null)
    const [gaveUp, setGaveUp] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        let checks = 0
        let timer = null
        // When the page closes, stop asking (see the return at the bottom).
        let stopped = false

        async function check() {
            try {
                const answer = await getPayment(id)
                if (stopped) return
                setPayment(answer)
                if (answer.status === 'paid') {
                    // Pro changes what the header/menus show - load "me" again.
                    refreshUser()
                    return
                }
            } catch {
                if (!stopped) setError('Payment not found.')
                return
            }
            checks += 1
            if (checks >= MAX_CHECKS) {
                setGaveUp(true)
                return
            }
            timer = setTimeout(check, CHECK_EVERY_MS)
        }

        check()
        return () => {
            stopped = true
            clearTimeout(timer)
        }
        // refreshUser is left out on purpose: it's a new function on
        // every render, and we only want to start checking once per id.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const isTip = payment?.kind === 'tip'
    const paid = payment?.status === 'paid'

    return (
        <PageLayout title={paid ? 'Thank you!' : 'Checking your payment...'} width='narrow'>
            {error && <p role='alert' className='text-red-400'>{error}</p>}

            {!paid && !gaveUp && !error && (
                // aria-live: screen readers announce it when it changes.
                <p aria-live='polite' className='text-gray-300'>Waiting for the payment service to confirm. This takes a few seconds.</p>
            )}

            {gaveUp && !paid && (
                <p className='text-gray-300'>
                    It's taking longer than usual. If you paid, it will show up in a few minutes - you don't need to pay again.
                    Still nothing after an hour? <Link to='/support' className='text-red-400 underline'>Tell us</Link>.
                </p>
            )}

            {paid && isTip && (
                <div className='rounded-2xl border border-amber-700/60 bg-amber-950/20 p-6 text-center'>
                    <Flame className='mx-auto h-10 w-10 text-amber-400' />
                    <p className='mt-3 text-lg text-white'>Your candle is lit for {payment.writer}.</p>
                    <p className='mt-1 text-sm text-gray-400'>They've been told. Writers really notice these.</p>
                    <Link to={`/stories/${payment.story_id}`} className='mt-6 inline-block rounded-full bg-red-600 px-6 py-2.5 font-semibold text-white hover:bg-red-700'>
                        Back to the story
                    </Link>
                </div>
            )}

            {paid && !isTip && (
                <div className='rounded-2xl border border-yellow-600/60 bg-yellow-950/20 p-6 text-center'>
                    <Crown className='mx-auto h-10 w-10 text-yellow-400' />
                    <p className='mt-3 text-lg text-white'>You're Pro now. Welcome!</p>
                    <p className='mt-1 text-sm text-gray-400'>Pick your name colour and avatar frame in Settings.</p>
                    <div className='mt-6 flex flex-wrap justify-center gap-3'>
                        <Link to='/settings' className='rounded-full bg-red-600 px-6 py-2.5 font-semibold text-white hover:bg-red-700'>Go to Settings</Link>
                        <Link to='/' className='rounded-full border border-slate-600 px-6 py-2.5 text-gray-200 hover:border-slate-400'>Start reading</Link>
                    </div>
                </div>
            )}
        </PageLayout>
    )
}

export default PaymentDonePage
