import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { getPremium, grantPremium, cancelPremium } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'
import { formatMoney } from '../../utils/format'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> PREMIUM MEMBERS (/dashboard/premium).
//
// Give someone premium (the PRO badge + premium features):
//   1 month / 1 year / Lifetime - with the amount they paid
//   Gift - free, for a number of days
// Giving it again while it still runs EXTENDS it (the new period
// starts when the current one ends).
//
// There's no online payment yet - record here what someone paid
// another way. The Revenue page adds these amounts up.
// Django: accounts/premium.py + dashboard/premium_views.py.
// ---------------------------------------------------------------

const PLANS = [
    { value: 'monthly', label: '1 month' },
    { value: 'yearly', label: '1 year' },
    { value: 'lifetime', label: 'Lifetime' },
    { value: 'gift', label: 'Gift' },
]

// A suggested price per plan - just a starting value in the box.
const SUGGESTED_PRICE = { monthly: '4.99', yearly: '39.00', lifetime: '99.00', gift: '0' }


function PremiumDashboard() {
    const [data, setData] = useState(null)
    const [form, setForm] = useState({ username: '', plan: 'monthly', amount: SUGGESTED_PRICE.monthly, note: '', gift_days: '30' })
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getPremium()
            .then(result => setData(result))
            .catch(() => setError('Could not load the premium members.'))
    }, [reloadKey])

    function updateForm(name, value) {
        setForm(current => {
            const next = { ...current, [name]: value }
            // Picking another plan also fills in its usual price.
            if (name === 'plan') next.amount = SUGGESTED_PRICE[value]
            return next
        })
    }

    async function handleGrant(event) {
        event.preventDefault()
        setError('')
        try {
            await grantPremium(form)
            setNotice(`${form.username} has premium.`)
            setForm({ ...form, username: '', note: '' })
            reload()
        } catch (err) {
            setError(err.data?.detail || 'Could not give premium.')
        }
    }

    async function handleCancel(membership) {
        if (!window.confirm(`Cancel this ${membership.plan_label} membership of ${membership.user}? (The money stays in the history.)`)) return
        await cancelPremium(membership.id)
        reload()
    }

    if (!data) return <p className='text-gray-400'>{error || 'Loading...'}</p>

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Crown className='h-7 w-7 text-yellow-400' />
                Premium Members
            </h1>
            <p className='mt-1 text-gray-400'>{data.members.length} members have premium right now.</p>

            <PageMessages error={error} notice={notice} />

            {/* ---------- GIVE PREMIUM ---------- */}
            <form onSubmit={handleGrant} className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <h2 className='font-semibold text-white'>Give premium</h2>
                <SegmentedControl label='Plan' options={PLANS} value={form.plan} onChange={value => updateForm('plan', value)} />

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                    <div>
                        <label htmlFor='username' className={LABEL_STYLE}>Username</label>
                        <input id='username' value={form.username} onChange={event => updateForm('username', event.target.value)} className={INPUT_STYLE} />
                    </div>
                    {form.plan === 'gift' ? (
                        <div>
                            <label htmlFor='gift_days' className={LABEL_STYLE}>For how many days</label>
                            <input id='gift_days' type='number' min='1' value={form.gift_days} onChange={event => updateForm('gift_days', event.target.value)} className={INPUT_STYLE} />
                        </div>
                    ) : (
                        <div>
                            <label htmlFor='amount' className={LABEL_STYLE}>Paid ({data.currency})</label>
                            <input id='amount' type='number' min='0' step='0.01' value={form.amount} onChange={event => updateForm('amount', event.target.value)} className={INPUT_STYLE} />
                        </div>
                    )}
                    <div>
                        <label htmlFor='note' className={LABEL_STYLE}>Note <span className='font-normal text-gray-500'>(optional)</span></label>
                        <input id='note' value={form.note} onChange={event => updateForm('note', event.target.value)} maxLength={200} placeholder='e.g. paid by bank transfer' className={INPUT_STYLE} />
                    </div>
                </div>

                <button type='submit' disabled={!form.username.trim()} className={BUTTON_STYLE}>Give premium</button>
            </form>

            {/* ---------- WHO HAS IT ---------- */}
            <h2 className='mt-10 font-semibold text-white'>Premium now</h2>
            <ul className='mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2'>
                {data.members.length === 0 && <li className='text-sm text-gray-500'>Nobody has premium yet.</li>}
                {data.members.map(member => (
                    <li key={member.username} className='flex items-center justify-between rounded-xl border border-yellow-900/50 bg-yellow-950/10 px-4 py-3 text-sm'>
                        <span className='flex items-center gap-2'>
                            <Crown className='h-4 w-4 text-yellow-400' />
                            <Link to={`/profile/${member.username}`} className='font-semibold text-white hover:text-yellow-300'>{member.username}</Link>
                        </span>
                        <span className='text-xs text-gray-400'>
                            {!member.has_membership ? 'set by hand (Users page)' : member.ends_at ? `until ${new Date(member.ends_at).toLocaleDateString()}` : 'lifetime'}
                            {' · '}paid {formatMoney(member.total_paid, data.currency)}
                        </span>
                    </li>
                ))}
            </ul>

            {/* ---------- HISTORY ---------- */}
            <h2 className='mt-10 font-semibold text-white'>History</h2>
            <div className='mt-3 overflow-x-auto rounded-xl border border-slate-800'>
                <table className='w-full min-w-[40rem] text-left text-sm'>
                    <thead>
                        <tr className='text-xs uppercase tracking-wider text-gray-400'>
                            <th className='px-4 py-3'>Member</th>
                            <th className='px-4 py-3'>Plan</th>
                            <th className='px-4 py-3 text-right'>Paid</th>
                            <th className='px-4 py-3'>Period</th>
                            <th className='px-4 py-3'></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.history.map(membership => (
                            <tr key={membership.id} className={`border-t border-slate-800 ${membership.is_active ? '' : 'text-gray-500'}`}>
                                <td className='px-4 py-3'>{membership.user}</td>
                                <td className='px-4 py-3'>{membership.plan_label}</td>
                                {/* tabular-nums = every digit the same width, so money lines up. */}
                                <td className='px-4 py-3 text-right tabular-nums'>{formatMoney(membership.amount, data.currency)}</td>
                                <td className='px-4 py-3 text-xs'>
                                    {new Date(membership.starts_at).toLocaleDateString()} – {membership.ends_at ? new Date(membership.ends_at).toLocaleDateString() : '∞'}
                                    {membership.cancelled_at && <span className='ml-2 text-red-400'>cancelled</span>}
                                </td>
                                <td className='px-4 py-3 text-right'>
                                    {membership.is_active && (
                                        <button type='button' onClick={() => handleCancel(membership)} className='text-xs text-gray-400 underline hover:text-red-400'>Cancel</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.history.length === 0 && <p className='py-8 text-center text-sm text-gray-500'>Nothing yet.</p>}
            </div>
        </div>
    )
}

export default PremiumDashboard
