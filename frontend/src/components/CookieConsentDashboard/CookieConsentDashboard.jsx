import { useState, useEffect } from 'react'
import { Cookie } from 'lucide-react'
import { getCookieAdmin, updateCookieBanner } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { Toggle } from '../SettingsPage/SettingsParts'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> COOKIE CONSENT (/dashboard/cookies).
//
// The cookie banner new visitors see (components/CookieBanner):
//   - switch it on / off
//   - change its text
//   - see how people chose: "Accept all" vs "Essential only"
// Only the choices are counted - nothing about who chose.
// ---------------------------------------------------------------

// A split bar: how much of the total was "all" vs "essential".
function ChoiceBar({ counts }) {
    const total = counts.all + counts.essential
    if (total === 0) return <p className='text-sm text-gray-500'>No choices yet.</p>

    const allPercent = Math.round((counts.all * 100) / total)
    return (
        <div>
            {/* Two coloured parts side by side; the gap-0.5 is the thin
                line between them. */}
            <div className='flex h-6 gap-0.5 overflow-hidden rounded' title={`${counts.all} accepted all, ${counts.essential} essential only`}>
                {counts.all > 0 && <div className='bg-red-600' style={{ width: `${allPercent}%` }} />}
                {counts.essential > 0 && <div className='bg-slate-500' style={{ width: `${100 - allPercent}%` }} />}
            </div>
            <div className='mt-2 flex justify-between text-sm'>
                <span className='text-gray-300'><span className='mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-red-600' />Accept all: <b className='text-white'>{counts.all}</b> ({allPercent}%)</span>
                <span className='text-gray-300'><span className='mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-slate-500' />Essential only: <b className='text-white'>{counts.essential}</b> ({100 - allPercent}%)</span>
            </div>
        </div>
    )
}


function CookieConsentDashboard() {
    const [data, setData] = useState(null)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    useEffect(() => {
        getCookieAdmin()
            .then(result => {
                setData(result)
                setMessage(result.message)
            })
            .catch(() => setError('Could not load the cookie settings.'))
    }, [])

    async function save(changes, doneText) {
        setError('')
        try {
            setData(await updateCookieBanner(changes))
            setNotice(doneText)
        } catch (err) {
            setError(err.data?.detail || 'Could not save.')
        }
    }

    if (!data) return <p className='text-gray-400'>{error || 'Loading...'}</p>

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Cookie className='h-7 w-7 text-amber-400' />
                Cookie Consent
            </h1>
            <p className='mt-1 text-gray-400'>The cookie banner new visitors see, and how they chose.</p>

            <PageMessages error={error} notice={notice} />

            <div className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <div className='flex items-center justify-between'>
                    <div>
                        <p className='font-semibold text-white'>Show the banner</p>
                        <p className='text-xs text-gray-400'>Visitors who already chose won't see it again.</p>
                    </div>
                    <Toggle
                        label='Show the cookie banner'
                        on={data.is_enabled}
                        onChange={on => save({ is_enabled: on }, on ? 'Banner switched on.' : 'Banner switched off.')}
                    />
                </div>

                <div>
                    <label htmlFor='cookie-message' className='mb-2 block text-sm font-semibold text-gray-200'>Banner text</label>
                    <textarea id='cookie-message' value={message} onChange={event => setMessage(event.target.value)} rows={3} maxLength={1000} className={`${INPUT_STYLE} resize-y`} />
                    <button
                        type='button'
                        onClick={() => save({ message }, 'Text saved.')}
                        disabled={!message.trim() || message === data.message}
                        className={`${BUTTON_STYLE} mt-2`}
                    >
                        Save text
                    </button>
                </div>
            </div>

            <div className='mt-6 grid gap-4 md:grid-cols-2'>
                <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
                    <p className='mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400'>Last 30 days</p>
                    <ChoiceBar counts={data.last_30_days} />
                </div>
                <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
                    <p className='mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400'>All time</p>
                    <ChoiceBar counts={data.all_time} />
                </div>
            </div>

            <p className='mt-4 text-xs text-gray-500'>
                The site only sets essential cookies today, so both choices work the same. The choice is kept so any
                future analytics can respect it.
            </p>
        </div>
    )
}

export default CookieConsentDashboard
