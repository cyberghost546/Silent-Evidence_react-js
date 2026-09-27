import { useState } from 'react'
import { MailWarning } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { resendVerification } from '../../api/client'


// ---------------------------------------------------------------
// A thin strip under the header: "Please confirm your email".
//
// Only for logged-in members whose email isn't confirmed yet
// (user.email_verified comes from Django, see user_data()).
// The button asks Django to send the email again. Once they click
// the link (VerifyEmail.jsx) the strip disappears.
//
// Why bother? Newsletters and digests only go to confirmed addresses,
// so this is how members make sure they get them.
// ---------------------------------------------------------------
function VerifyEmailBanner() {
    const { user } = useAuth()
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)

    // Not logged in, or already confirmed: nothing to show.
    // (=== false, not !user.email_verified: if Django didn't send the
    // field at all, better to stay quiet than nag everyone.)
    if (!user || user.email_verified !== false) return null

    async function handleResend() {
        setSending(true)
        try {
            const answer = await resendVerification()
            setMessage(answer.detail)
        } catch (err) {
            // 429 after 3 tries in an hour.
            setMessage(err.data?.detail || 'Could not send it. Try again later.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div role='status' className='border-b border-amber-900/60 bg-amber-950/40 px-4 py-2.5 text-sm text-amber-100'>
            <div className='mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center'>
                <MailWarning className='h-4 w-4 shrink-0 text-amber-300' />
                <span>Please confirm your email address - we sent a link to <strong>{user.email}</strong>.</span>
                {message ? (
                    <span className='text-amber-200/80'>{message}</span>
                ) : (
                    <button type='button' onClick={handleResend} disabled={sending} className='font-semibold text-amber-300 underline hover:text-amber-200 disabled:opacity-50'>
                        {sending ? 'Sending...' : 'Send it again'}
                    </button>
                )}
            </div>
        </div>
    )
}

export default VerifyEmailBanner
