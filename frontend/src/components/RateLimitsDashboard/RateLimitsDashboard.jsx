import { useState, useEffect } from 'react'
import { Gauge } from 'lucide-react'
import { getRateLimits, updateRateLimits } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> RATE LIMITS (/dashboard/rate-limits).
//
// "How much is too much?" - the numbers that stop spam and password
// guessing. Django reads them on every request, so a change works
// immediately, no restart needed.
//
// The page is built from the GROUPS list below: to add a new limit,
// add a field to SiteSettings (Django), then one line here.
// ---------------------------------------------------------------
const GROUPS = [
    {
        title: 'Login lock',
        text: 'Too many wrong passwords = locked for a while. Stops password guessing.',
        fields: [
            { name: 'login_max_per_username', label: 'Failed tries per account', unit: 'tries' },
            { name: 'login_max_per_ip', label: 'Failed tries per IP address', unit: 'tries' },
            { name: 'login_lock_minutes', label: 'Locked for', unit: 'minutes' },
        ],
    },
    {
        title: 'Posting',
        text: 'Per person, per hour. Admins are never limited.',
        fields: [
            { name: 'comments_per_hour', label: 'Comments', unit: 'per hour' },
            { name: 'messages_per_hour', label: 'Private messages', unit: 'per hour' },
            { name: 'contact_per_hour', label: 'Contact form', unit: 'per hour' },
        ],
    },
]


function RateLimitsDashboard() {
    // saved = what Django has; form = what's in the boxes right now.
    const [saved, setSaved] = useState(null)
    const [form, setForm] = useState({})
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    useEffect(() => {
        getRateLimits()
            .then(data => {
                setSaved(data)
                setForm(data)
            })
            .catch(() => setError('Could not load the limits.'))
    }, [])

    // Only the boxes whose number is different from the saved one.
    // Object.keys(...).filter(...) -> ['comments_per_hour', ...]
    const changedNames = saved ? Object.keys(form).filter(name => String(form[name]) !== String(saved[name])) : []

    async function handleSave(event) {
        event.preventDefault()
        setError('')
        setNotice('')
        // Build { comments_per_hour: 20, ... } from the changed names.
        const changes = {}
        for (const name of changedNames) changes[name] = Number(form[name])
        try {
            const data = await updateRateLimits(changes)
            setSaved(data)
            setForm(data)
            setNotice('Limits saved - they work right away.')
        } catch (err) {
            setError(err.data ? Object.values(err.data).flat().join(' ') : 'Could not save.')
        }
    }

    if (!saved) return <p className='text-gray-400'>{error || 'Loading limits...'}</p>

    return (
        <form onSubmit={handleSave} className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Gauge className='h-7 w-7 text-red-500' />
                Rate Limits
            </h1>
            <p className='mt-1 text-gray-400'>How much is too much. Changes work immediately.</p>

            <PageMessages error={error} notice={notice} />

            {GROUPS.map(group => (
                <section key={group.title} className='mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                    <h2 className='text-lg font-bold text-white'>{group.title}</h2>
                    <p className='mt-1 text-sm text-gray-400'>{group.text}</p>

                    <div className='mt-5 grid gap-4 sm:grid-cols-3'>
                        {group.fields.map(field => (
                            <label key={field.name} className='block'>
                                <span className='text-sm text-gray-300'>{field.label}</span>
                                <div className='mt-2 flex items-center gap-2'>
                                    <input
                                        type='number'
                                        min={1}
                                        value={form[field.name]}
                                        onChange={event => setForm({ ...form, [field.name]: event.target.value })}
                                        className={`${INPUT_STYLE} min-w-0 [color-scheme:dark]`}
                                    />
                                    <span className='whitespace-nowrap text-xs text-gray-500'>{field.unit}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </section>
            ))}

            <div className='mt-6 flex items-center gap-4'>
                <button type='submit' disabled={changedNames.length === 0} className={BUTTON_STYLE}>Save limits</button>
                {changedNames.length > 0 && <span className='text-sm text-amber-300'>{changedNames.length} unsaved {changedNames.length === 1 ? 'change' : 'changes'}</span>}
            </div>
        </form>
    )
}

export default RateLimitsDashboard
