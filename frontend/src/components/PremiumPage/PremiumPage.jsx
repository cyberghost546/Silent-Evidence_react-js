import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Crown } from 'lucide-react'
import { getPaymentPlans, startCheckout } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { formatLongDate, formatMoney } from '../../utils/format'
import PageLayout from '../PageLayout/PageLayout'
import { READER_PERKS, WRITER_PERKS, ALWAYS_FREE } from './proPerks'


// ---------------------------------------------------------------
// THE PRO PAGE (/premium) - what Pro gives you, and the Buy buttons.
//
// Buying, step by step:
//   1. Click "Get Pro" -> startCheckout({ kind: 'pro_monthly' })
//   2. Django answers with a URL: Stripe's payment page (or, on your
//      computer without Stripe, our fake one: FakePaymentPage.jsx)
//   3. window.location.assign(url) -> the browser goes there
//   4. After paying you land on /payment/done/<id> (PaymentDonePage.jsx)
//
// Why window.location and not navigate()? navigate() only moves
// between OUR pages. Stripe is another website, so we need a real
// page load.
// ---------------------------------------------------------------
function PremiumPage() {
    const { user } = useAuth()
    const location = useLocation()
    const [info, setInfo] = useState(null)
    const [error, setError] = useState('')
    // Which plan's button is busy ('pro_monthly'...), or '' = none.
    const [buying, setBuying] = useState('')

    useEffect(() => {
        getPaymentPlans()
            .then(setInfo)
            .catch(() => setError('Could not load the prices. Is Django running?'))
    }, [])

    async function handleBuy(kind) {
        setBuying(kind)
        setError('')
        try {
            const answer = await startCheckout({ kind })
            window.location.assign(answer.url)
        } catch (err) {
            setError(err.data?.detail || 'Something went wrong. Try again.')
            setBuying('')
        }
        // No setBuying('') after success on purpose: the page is about
        // to change, and the button should stay "Opening..." until then.
    }

    return (
        <PageLayout title='Silent Evidence Pro' subtitle='Read first. Stand out. Write better. And keep the lights on.'>
            {error && <p role='alert' className='mb-6 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300'>{error}</p>}

            {/* ---------- Already Pro? ---------- */}
            {info?.me?.is_pro && (
                <div className='mb-8 flex items-center gap-3 rounded-xl border border-yellow-600/60 bg-yellow-950/30 px-5 py-4 text-yellow-100'>
                    <Crown className='h-6 w-6 shrink-0 text-yellow-400' />
                    <p>
                        You're Pro
                        {info.me.pro_ends_at === 'lifetime'
                            ? ' for life. Thank you!'
                            : ` until ${formatLongDate(info.me.pro_ends_at)}. Buying again adds the time on the end.`}
                    </p>
                </div>
            )}

            {/* ---------- The perks ---------- */}
            <div className='grid gap-6 md:grid-cols-2'>
                <PerkList title='For readers' perks={READER_PERKS} />
                <PerkList title='For writers' perks={WRITER_PERKS} />
            </div>

            {/* ---------- The plans ---------- */}
            <h2 className='mt-12 text-2xl font-bold text-white'>Pick a plan</h2>
            <p className='mt-1 text-sm text-gray-400'>
                One payment, no subscription: nothing renews by itself, and there's nothing to cancel.
            </p>

            {info?.mode === 'off' && (
                <p className='mt-4 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-gray-300'>
                    Payments open soon. Check back in a little while!
                </p>
            )}
            {info?.mode === 'fake' && (
                <p className='mt-4 rounded-lg border border-amber-700/70 bg-amber-950/30 px-4 py-3 text-sm text-amber-200'>
                    Test mode: there's no Stripe key on this computer, so buying uses a pretend payment page. No real money.
                </p>
            )}

            <div className='mt-6 grid gap-6 sm:grid-cols-2'>
                {info?.plans.map(plan => (
                    <div key={plan.kind} className='flex flex-col rounded-2xl border border-slate-700 bg-slate-900/70 p-6'>
                        <h3 className='text-lg font-semibold text-white'>{plan.label}</h3>
                        <p className='mt-2 text-4xl font-extrabold text-white'>{formatMoney(plan.price, info.currency)}</p>
                        {plan.kind === 'pro_yearly' && (
                            <p className='mt-1 text-sm font-semibold text-emerald-400'>About 4 months free</p>
                        )}

                        {/* mt-auto pushes the button to the bottom, so both cards line up. */}
                        <div className='mt-auto pt-6'>
                            {user ? (
                                <button
                                    type='button'
                                    onClick={() => handleBuy(plan.kind)}
                                    disabled={info.mode === 'off' || buying !== ''}
                                    className='w-full rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                                >
                                    {buying === plan.kind ? 'Opening the payment page...' : info.me?.is_pro ? 'Add more time' : 'Get Pro'}
                                </button>
                            ) : (
                                // state.from = come back here after logging in.
                                <Link
                                    to='/login'
                                    state={{ from: location.pathname }}
                                    className='block w-full rounded-full bg-red-600 px-5 py-2.5 text-center font-semibold text-white hover:bg-red-700'
                                >
                                    Log in to get Pro
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ---------- Always free ---------- */}
            <section className='mt-12 rounded-2xl border border-slate-800 bg-slate-900/40 p-6'>
                <h2 className='text-lg font-bold text-white'>Always free, for everyone</h2>
                <ul className='mt-3 space-y-2'>
                    {ALWAYS_FREE.map(item => (
                        <li key={item} className='flex gap-2 text-sm text-gray-300'>
                            <Check className='mt-0.5 h-4 w-4 shrink-0 text-emerald-400' />
                            {item}
                        </li>
                    ))}
                </ul>
                <p className='mt-4 text-xs text-gray-500'>
                    Payments are handled by Stripe. Your card details go to Stripe, never to Silent Evidence.
                </p>
            </section>
        </PageLayout>
    )
}


// One column of perks: a heading, then icon + title + text for each.
function PerkList({ title, perks }) {
    return (
        <section className='rounded-2xl border border-slate-800 bg-slate-900/40 p-6'>
            <h2 className='text-sm font-bold uppercase tracking-wider text-yellow-400'>{title}</h2>
            <ul className='mt-4 space-y-5'>
                {perks.map(perk => {
                    // A component stored in an object must be in a
                    // Capitalised variable to be used as <Icon />.
                    const Icon = perk.icon
                    return (
                        <li key={perk.title} className='flex gap-3'>
                            <Icon className='mt-0.5 h-5 w-5 shrink-0 text-red-500' aria-hidden='true' />
                            <div>
                                <p className='font-semibold text-white'>{perk.title}</p>
                                <p className='text-sm text-gray-400'>{perk.text}</p>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}

export default PremiumPage
