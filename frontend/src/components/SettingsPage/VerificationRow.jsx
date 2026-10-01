import { useState, useEffect } from 'react'
import { BadgeCheck } from 'lucide-react'
import { getMyVerification, requestVerification } from '../../api/client'
import { SettingRow } from './SettingsParts'
import { INPUT_STYLE, BUTTON_STYLE, FIELD_ERROR_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// "Get verified" on Settings -> Account.
//
// Four possible states, from Django (/api/verification/):
//   already verified   -> a blue check, nothing to do
//   request waiting    -> "an admin will look at it"
//   rejected before    -> the admin's note + ask again
//   nothing yet        -> a small form: why + a link as proof
// Admins decide on Admin Dashboard -> Verification.
// ---------------------------------------------------------------
function VerificationRow({ onMessage }) {
    const [data, setData] = useState(null)
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState('')
    const [proofUrl, setProofUrl] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        getMyVerification()
            .then(result => setData(result))
            .catch(() => {})
    }, [])

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')
        try {
            const created = await requestVerification(reason.trim(), proofUrl.trim())
            // Put the new request first - it's now the latest one.
            setData({ ...data, requests: [created, ...data.requests] })
            setOpen(false)
            onMessage('Request sent - an admin will look at it.')
        } catch (err) {
            setError(err.data?.detail || 'Could not send the request.')
        }
    }

    if (!data) return null

    const latest = data.requests[0]   // newest first

    if (data.is_verified) {
        return (
            <SettingRow title='Verified' text='Your profile shows the blue check mark.'>
                <BadgeCheck className='h-6 w-6 text-blue-400' />
            </SettingRow>
        )
    }

    return (
        <div className='rounded-xl border border-slate-800 bg-slate-900 p-5'>
            <div className='flex items-center justify-between gap-4'>
                <div>
                    <p className='flex items-center gap-2 font-semibold text-white'>
                        <BadgeCheck className='h-4 w-4 text-blue-400' /> Get verified
                    </p>
                    <p className='mt-1 text-xs text-gray-400'>
                        {latest?.status === 'pending'
                            ? 'Your request is waiting for an admin.'
                            : 'For published authors, podcasters and other known voices in horror.'}
                    </p>
                    {latest?.status === 'rejected' && (
                        <p className='mt-1 text-xs text-amber-300'>
                            Your last request was not approved{latest.admin_note ? `: "${latest.admin_note}"` : '.'}
                        </p>
                    )}
                </div>
                {latest?.status !== 'pending' && !open && (
                    <button type='button' onClick={() => setOpen(true)} className='text-xs font-semibold text-red-400 hover:text-red-300'>
                        Request
                    </button>
                )}
            </div>

            {open && (
                <form onSubmit={handleSubmit} className='mt-4 space-y-3 border-t border-slate-800 pt-4'>
                    <textarea
                        value={reason}
                        onChange={event => setReason(event.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder='Who are you? e.g. "I host the Night Shift horror podcast."'
                        aria-label='Why should you be verified?'
                        className={`${INPUT_STYLE} resize-none text-sm`}
                    />
                    <input
                        type='url'
                        value={proofUrl}
                        onChange={event => setProofUrl(event.target.value)}
                        placeholder='A link that proves it (optional)'
                        aria-label='Proof link'
                        className={`${INPUT_STYLE} text-sm`}
                    />
                    {error && <p className={FIELD_ERROR_STYLE}>{error}</p>}
                    <div className='flex gap-2'>
                        <button type='submit' disabled={reason.trim().length < 10} className={BUTTON_STYLE}>Send request</button>
                        <button type='button' onClick={() => setOpen(false)} className='rounded-lg border border-slate-600 px-4 text-sm text-gray-300'>Cancel</button>
                    </div>
                </form>
            )}
        </div>
    )
}

export default VerificationRow
