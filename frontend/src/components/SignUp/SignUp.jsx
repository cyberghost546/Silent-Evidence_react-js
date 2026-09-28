import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSiteStatus } from '../../hooks/useSiteStatus'
import PasswordInput from '../PasswordInput/PasswordInput'
import PasswordStrength from '../PasswordStrength/PasswordStrength'
import AuthLayout from '../AuthLayout/AuthLayout'
import { LABEL_STYLE, INPUT_STYLE, BUTTON_STYLE, FIELD_ERROR_STYLE } from '../../styles/formStyles'

// Two CSS Modules. `styles` is this page's own (the "or register
// with email" divider). `authStyles` is shared with Log In (the
// glowing card). See the comments in each .css file.
import styles from './SignUp.module.css'
import authStyles from '../AuthLayout/AuthLayout.module.css'


// Both "Continue with..." buttons share everything except colours,
// so the shared part is written once here.
const SOCIAL_BUTTON = 'w-full flex items-center justify-center gap-3 py-3 rounded-lg font-medium transition-colors'


// ---------------------------------------------------------------
// Small helper components, only used in this file.
// If the Log In page needs them later, move them to their own files
// (like PasswordInput) and import them in both places.
// ---------------------------------------------------------------

// Google's "G". Each <path> is one coloured piece of the letter.
function GoogleIcon() {
    return (
        <svg className='w-5 h-5' viewBox='0 0 48 48' aria-hidden='true'>
            <path fill='#FFC107' d='M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z' />
            <path fill='#FF3D00' d='M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z' />
            <path fill='#4CAF50' d='M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z' />
            <path fill='#1976D2' d='M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z' />
        </svg>
    )
}

// Microsoft's logo is just four coloured squares.
function MicrosoftIcon() {
    return (
        <svg className='w-5 h-5' viewBox='0 0 21 21' aria-hidden='true'>
            <rect x='1' y='1' width='9' height='9' fill='#F25022' />
            <rect x='11' y='1' width='9' height='9' fill='#7FBA00' />
            <rect x='1' y='11' width='9' height='9' fill='#00A4EF' />
            <rect x='11' y='11' width='9' height='9' fill='#FFB900' />
        </svg>
    )
}

// Shows the error messages for ONE field, or nothing.
// Django sends a list per field, e.g.
//   { password: ['This password is too short.', 'This password is too common.'] }
// so we join them into one line.
function FieldError({ messages }) {
    if (!messages) return null
    return <p className={FIELD_ERROR_STYLE}>{messages.join(' ')}</p>
}


// The Sign Up page (/signup).
function SignUp() {
    const { signup } = useAuth()
    const navigate = useNavigate()
    const site = useSiteStatus()

    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        password2: '',
    })

    // Unlike Log In, errors here are an OBJECT - one entry per field -
    // so each message can appear under its own input:
    //   { username: [...], email: [...], password: [...], detail: '...' }
    // {} = no errors.
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)

    function handleChange(event) {
        setForm({ ...form, [event.target.name]: event.target.value })
    }

    // Google / Microsoft sign-up needs extra setup in Django first
    // (an app registered with Google/Microsoft, plus a library like
    // django-allauth). Until then, the buttons just say so.
    function handleSocialClick(provider) {
        setErrors({ detail: `${provider} sign-up isn't connected yet. Please use your email for now.` })
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setErrors({})

        // Check this one ourselves - Django never sees password2,
        // it's only here to catch typos.
        if (form.password !== form.password2) {
            setErrors({ password2: ['The passwords do not match.'] })
            return
        }

        setSaving(true)

        try {
            await signup(form.username, form.email, form.password)
            // Django logged us in already, so go straight home.
            navigate('/')
        } catch (err) {
            setErrors(err.data || { detail: 'Could not reach the server. Is Django running?' })
            setSaving(false)
        }
    }

    // For the little message under "Confirm Password". Only once
    // they've started typing the second one - before that, there's
    // nothing to compare.
    const passwordsMatch = form.password2 !== '' && form.password === form.password2

    // Admins can close sign-ups (Dashboard -> Site Settings). Then we
    // show a notice instead of the form. (Django refuses too - this
    // is just so nobody fills in the whole form for nothing.)
    const signupsClosed = site && !site.signups_open

    return (
        // <AuthLayout> = the dark full-screen page with the
        // "Back to site" link. Same as Log In.
        <AuthLayout>

            {/* authStyles.card (from the shared CSS Module) = gradient
                + red glow. Everything else is Tailwind. The template
                string glues them together into one className. */}
            <div className={`${authStyles.card} w-full max-w-lg rounded-2xl border border-slate-800 p-8 text-white sm:p-9`}>

                {/* ---------- TITLE ---------- */}
                <h1 className='text-3xl font-extrabold'>Create an account</h1>
                <p className='mt-1 text-sm text-gray-400'>Join Silent Evidence today</p>

                {signupsClosed ? (
                    <div className='mt-8 rounded-xl border border-amber-800 bg-amber-950/30 p-5 text-sm text-amber-100'>
                        <p className='font-semibold'>Sign-ups are closed right now.</p>
                        <p className='mt-1 text-amber-200/80'>Please try again later. Already have an account? <Link to='/login' className='font-semibold text-red-400 hover:text-red-300'>Log in</Link></p>
                    </div>
                ) : (
                <>
                {/* ---------- SOCIAL BUTTONS ---------- */}
                {/* space-y-3 = a gap between the two buttons. */}
                <div className='mt-8 space-y-3'>
                    <button
                        type='button'
                        onClick={() => handleSocialClick('Google')}
                        className={`${SOCIAL_BUTTON} bg-white text-gray-900 hover:bg-gray-200`}
                    >
                        <GoogleIcon />
                        Continue with Google
                    </button>

                    <button
                        type='button'
                        onClick={() => handleSocialClick('Microsoft')}
                        className={`${SOCIAL_BUTTON} bg-neutral-800 border border-neutral-600 text-white hover:bg-neutral-700`}
                    >
                        <MicrosoftIcon />
                        Continue with Microsoft
                    </button>
                </div>

                {/* The lines on both sides come from the CSS Module. */}
                <div className={`${styles.divider} my-6 text-xs text-slate-400`}>
                    or register with email
                </div>

                {/* ---------- THE FORM ---------- */}
                <form onSubmit={handleSubmit} className='space-y-5'>

                    {/* "detail" = an error that isn't about one field. */}
                    {errors.detail && (
                        <p className='bg-red-900/50 border border-red-600 text-red-100 rounded-lg p-3 text-sm'>
                            {errors.detail}
                        </p>
                    )}

                    <div>
                        <label htmlFor='username' className={LABEL_STYLE}>Username</label>
                        <input
                            id='username'
                            name='username'
                            value={form.username}
                            onChange={handleChange}
                            placeholder='johndoe'
                            autoComplete='username'
                            required
                            className={INPUT_STYLE}
                        />
                        <FieldError messages={errors.username} />
                    </div>

                    <div>
                        <label htmlFor='email' className={LABEL_STYLE}>Email</label>
                        {/* type='email' makes the browser check for an @
                            before it even lets you submit. */}
                        <input
                            id='email'
                            name='email'
                            type='email'
                            value={form.email}
                            onChange={handleChange}
                            placeholder='you@example.com'
                            autoComplete='email'
                            required
                            className={INPUT_STYLE}
                        />
                        <FieldError messages={errors.email} />
                    </div>

                    <div>
                        <label htmlFor='password' className={LABEL_STYLE}>Password</label>
                        {/* Same props as a normal <input> - PasswordInput
                            passes them all through and adds the eye.
                            new-password tells password managers to
                            suggest a strong one. */}
                        <PasswordInput
                            id='password'
                            name='password'
                            value={form.password}
                            onChange={handleChange}
                            placeholder='Min. 8 characters'
                            autoComplete='new-password'
                            required
                        />
                        {/* The 4 bars that fill up as the password
                            gets stronger. Just a hint - Django has the
                            final say (the red message below it). */}
                        <PasswordStrength password={form.password} />
                        <FieldError messages={errors.password} />
                    </div>

                    <div>
                        <label htmlFor='password2' className={LABEL_STYLE}>Confirm Password</label>
                        <PasswordInput
                            id='password2'
                            name='password2'
                            value={form.password2}
                            onChange={handleChange}
                            placeholder='Repeat your password'
                            autoComplete='new-password'
                            required
                        />

                        {/* Live check while typing. If there's already
                            an error from pressing the button, that shows
                            instead (it's more important). */}
                        {errors.password2 ? (
                            <FieldError messages={errors.password2} />
                        ) : passwordsMatch ? (
                            <p className='mt-1 flex items-center gap-1 text-sm text-green-400'>
                                <CheckCircle2 className='h-4 w-4' /> Passwords match
                            </p>
                        ) : form.password2 !== '' && (
                            <p className='mt-1 text-sm text-gray-500'>Passwords don't match yet</p>
                        )}
                    </div>

                    <button type='submit' disabled={saving} className={`${BUTTON_STYLE} w-full`}>
                        {saving ? 'Creating account...' : 'Create account'}
                    </button>
                </form>

                <p className='mt-6 text-center text-sm text-gray-400'>
                    Already have an account?{' '}
                    {/* <Link> instead of <a>: changes page without
                        reloading the whole app. */}
                    <Link to='/login' className='font-semibold text-red-500 hover:text-red-400'>Sign in</Link>
                </p>
                </>
                )}
            </div>

            <p className='mt-8 text-center text-sm text-slate-400'>
                By creating an account you agree to our Terms &amp; Privacy Policy
            </p>
        </AuthLayout>
    )
}

export default SignUp
