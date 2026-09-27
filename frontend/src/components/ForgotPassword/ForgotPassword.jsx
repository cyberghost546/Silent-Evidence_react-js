import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { requestPasswordReset } from '../../api/client'
import AuthLayout from '../AuthLayout/AuthLayout'
import { usePageTitle } from '../../hooks/usePageTitle'
import { LABEL_STYLE, INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'
import authStyles from '../AuthLayout/AuthLayout.module.css'


// ---------------------------------------------------------------
// "FORGOT PASSWORD?" (/forgot-password) - step 1 of 2.
//
// Type your email -> Django emails you a link (accounts/password_views.py).
// The link opens ResetPassword.jsx (step 2).
//
// We always show the same "check your inbox" message, even if the
// email isn't registered - otherwise this page would tell strangers
// who has an account here.
//
// Same card + background as Log In (AuthLayout + authStyles.card).
// ---------------------------------------------------------------
function ForgotPassword() {
    usePageTitle('Forgot password')
    const [email, setEmail] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    // Django's "we sent it" message. Set = show the done screen.
    const [sentMessage, setSentMessage] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')
        if (!email.trim()) {
            setError('Enter the email address of your account.')
            return
        }
        setSending(true)
        try {
            const answer = await requestPasswordReset(email.trim())
            setSentMessage(answer.detail)
        } catch (err) {
            // e.g. 429 "Request was throttled" after too many tries.
            setError(err.data?.detail || err.data?.email?.[0] || 'Something went wrong. Try again in a minute.')
        } finally {
            setSending(false)
        }
    }

    return (
        <AuthLayout>
            <div className={`${authStyles.card} w-full max-w-lg rounded-2xl border border-slate-800 p-8 text-white sm:p-10`}>
                {sentMessage ? (
                    // ---------- DONE: check your inbox ----------
                    <div className='text-center'>
                        <MailCheck className='mx-auto h-12 w-12 text-red-500' />
                        <h1 className='mt-4 text-2xl font-bold'>Check your email</h1>
                        <p className='mt-3 text-gray-400'>{sentMessage}</p>
                        <p className='mt-8 text-sm text-gray-500'>
                            Nothing after a few minutes? <button type='button' onClick={() => setSentMessage('')} className='font-semibold text-red-400 hover:text-red-300'>Try again</button>
                        </p>
                    </div>
                ) : (
                    // ---------- THE FORM ----------
                    <form onSubmit={handleSubmit} noValidate>
                        <h1 className='text-3xl font-bold'>Forgot your password?</h1>
                        <p className='mt-2 text-gray-400'>No problem. We'll email you a link to choose a new one.</p>

                        {error && (
                            <p role='alert' className='mt-6 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200'>
                                {error}
                            </p>
                        )}

                        <div className='mt-8'>
                            <label htmlFor='email' className={LABEL_STYLE}>Email address</label>
                            <input
                                id='email'
                                type='email'
                                autoComplete='email'
                                value={email}
                                onChange={event => setEmail(event.target.value)}
                                placeholder='you@example.com'
                                className={INPUT_STYLE}
                            />
                        </div>

                        <button type='submit' disabled={sending} className={`${BUTTON_STYLE} mt-8 w-full`}>
                            {sending ? 'Sending...' : 'Send me the link'}
                        </button>
                    </form>
                )}

                <p className='mt-8 border-t border-slate-800 pt-8 text-center text-gray-400'>
                    Remembered it? <Link to='/login' className='font-semibold text-red-500 hover:text-red-400'>Back to Sign in</Link>
                </p>
            </div>
        </AuthLayout>
    )
}

export default ForgotPassword
