import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { confirmPasswordReset } from '../../api/client'
import AuthLayout from '../AuthLayout/AuthLayout'
import PasswordInput from '../PasswordInput/PasswordInput'
import PasswordStrength from '../PasswordStrength/PasswordStrength'
import { usePageTitle } from '../../hooks/usePageTitle'
import { LABEL_STYLE, BUTTON_STYLE, FIELD_ERROR_STYLE } from '../../styles/formStyles'
import authStyles from '../AuthLayout/AuthLayout.module.css'


// ---------------------------------------------------------------
// CHOOSE A NEW PASSWORD (/reset-password/:uid/:token) - step 2 of 2.
//
// The link in the "reset your password" email opens this page.
// useParams() reads uid and token from the URL, and we send them to
// Django together with the new password. Django checks the token is
// real, not too old, and not used before (accounts/password_views.py).
// ---------------------------------------------------------------
function ResetPassword() {
    usePageTitle('New password')
    const { uid, token } = useParams()
    const [password, setPassword] = useState('')
    const [password2, setPassword2] = useState('')
    const [saving, setSaving] = useState(false)
    // error = about the whole page (e.g. an old link),
    // passwordErrors = Django's reasons about the password itself.
    const [error, setError] = useState('')
    const [passwordErrors, setPasswordErrors] = useState([])
    const [done, setDone] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')
        setPasswordErrors([])

        // Checked here first - no need to ask Django about a typo.
        if (password !== password2) {
            setPasswordErrors(["The two passwords don't match."])
            return
        }

        setSaving(true)
        try {
            await confirmPasswordReset(uid, token, password)
            setDone(true)
        } catch (err) {
            if (err.data?.password) setPasswordErrors(err.data.password)
            else setError(err.data?.detail || 'Something went wrong. Try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <AuthLayout>
            <div className={`${authStyles.card} w-full max-w-lg rounded-2xl border border-slate-800 p-8 text-white sm:p-10`}>
                {done ? (
                    <div className='text-center'>
                        <CheckCircle2 className='mx-auto h-12 w-12 text-green-500' />
                        <h1 className='mt-4 text-2xl font-bold'>Password changed</h1>
                        <p className='mt-3 text-gray-400'>You can sign in with your new password now.</p>
                        <Link to='/login' className={`${BUTTON_STYLE} mt-8 inline-block`}>Sign in</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        <h1 className='text-3xl font-bold'>Choose a new password</h1>
                        <p className='mt-2 text-gray-400'>At least 8 characters, and not an easy one to guess.</p>

                        {error && (
                            <div role='alert' className='mt-6 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200'>
                                {error}{' '}
                                {/* An old or used link: offer a fresh one. */}
                                <Link to='/forgot-password' className='font-semibold underline'>Get a new link</Link>
                            </div>
                        )}

                        <div className='mt-8'>
                            <label htmlFor='password' className={LABEL_STYLE}>New password</label>
                            <PasswordInput id='password' name='password' autoComplete='new-password' value={password} onChange={event => setPassword(event.target.value)} />
                            <PasswordStrength password={password} />
                        </div>

                        <div className='mt-6'>
                            <label htmlFor='password2' className={LABEL_STYLE}>Confirm new password</label>
                            <PasswordInput id='password2' name='password2' autoComplete='new-password' value={password2} onChange={event => setPassword2(event.target.value)} />
                            {passwordErrors.map(message => <p key={message} className={FIELD_ERROR_STYLE}>{message}</p>)}
                        </div>

                        <button type='submit' disabled={saving || !password || !password2} className={`${BUTTON_STYLE} mt-8 w-full`}>
                            {saving ? 'Saving...' : 'Save new password'}
                        </button>
                    </form>
                )}
            </div>
        </AuthLayout>
    )
}

export default ResetPassword
