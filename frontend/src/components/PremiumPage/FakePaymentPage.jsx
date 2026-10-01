import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { fakePay, getPayment, getPaymentPlans } from '../../api/client'
import { formatMoney } from '../../utils/format'
import PageLayout from '../PageLayout/PageLayout'


// ---------------------------------------------------------------
// THE PRETEND PAYMENT PAGE (/payment/fake/<id>) - only on your
// computer, when there's no Stripe key (payment_mode() == 'fake').
//
// It stands in for Stripe's real page, so you can try Pro and tips
// without an account. "Pay" calls Django's fake-pay, which does
// exactly what Stripe's webhook would do (payments/fulfil.py).
//
// On the live site Django refuses fake-pay (404), so this page can't
// give anything away there.
// ---------------------------------------------------------------
function FakePaymentPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [payment, setPayment] = useState(null)
    const [currency, setCurrency] = useState('EUR')
    const [error, setError] = useState('')
    const [paying, setPaying] = useState(false)

    useEffect(() => {
        getPayment(id)
            .then(setPayment)
            .catch(() => setError('Payment not found.'))
        getPaymentPlans()
            .then(info => setCurrency(info.currency))
            .catch(() => {})   // the price just shows in euros then
    }, [id])

    async function handlePay() {
        setPaying(true)
        try {
            await fakePay(id)
            navigate(`/payment/done/${id}`)
        } catch (err) {
            setError(err.data?.detail || 'Could not pay.')
            setPaying(false)
        }
    }

    // Cancel = go back to where you came from (the Pro page or the story).
    function handleCancel() {
        navigate(payment?.story_id ? `/stories/${payment.story_id}` : '/premium')
    }

    return (
        <PageLayout title='Test payment' width='narrow'>
            <div className='rounded-2xl border border-amber-700/70 bg-amber-950/20 p-6'>
                <p className='flex items-center gap-2 font-semibold text-amber-200'>
                    <FlaskConical className='h-5 w-5' />
                    Pretend payment page - no real money
                </p>
                <p className='mt-2 text-sm text-amber-100/80'>
                    The real site shows Stripe's payment page here. This one only exists on your computer.
                </p>

                {error && <p role='alert' className='mt-4 text-sm text-red-400'>{error}</p>}

                {payment && (
                    <>
                        <p className='mt-6 text-lg text-white'>
                            {payment.kind === 'tip'
                                ? `A candle for ${payment.writer} ("${payment.story_title}")`
                                : payment.kind === 'pro_yearly' ? 'Pro - 1 year' : 'Pro - 1 month'}
                        </p>
                        <p className='text-3xl font-extrabold text-white'>{formatMoney(payment.amount, currency)}</p>

                        {payment.status === 'paid' ? (
                            <p className='mt-6 text-emerald-400'>Already paid.</p>
                        ) : (
                            <div className='mt-6 flex flex-wrap gap-3'>
                                <button
                                    type='button'
                                    onClick={handlePay}
                                    disabled={paying}
                                    className='rounded-full bg-emerald-600 px-6 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'
                                >
                                    {paying ? 'Paying...' : 'Pay (fake)'}
                                </button>
                                <button
                                    type='button'
                                    onClick={handleCancel}
                                    className='rounded-full border border-slate-600 px-6 py-2.5 text-gray-200 hover:border-slate-400'
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </PageLayout>
    )
}

export default FakePaymentPage
