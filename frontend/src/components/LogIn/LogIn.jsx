import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import PasswordInput from '../PasswordInput/PasswordInput'
import AuthLayout from '../AuthLayout/AuthLayout'
import { LABEL_STYLE, INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'

// The glowing card style, shared with Sign Up.
import authStyles from '../AuthLayout/AuthLayout.module.css'


// ---------------------------------------------------------------
// THE LOG IN PAGE (/login)
//
// The dark page and "Back to site" link come from
// <AuthLayout> - the same frame the Sign Up page uses.
//
// One box takes an email OR a username; Django works out which one
// it is (LogInView in accounts/views.py).
// ---------------------------------------------------------------
function LogIn() {
    // login() comes from AuthProvider - it talks to Django AND
    // updates the user everywhere (the Header switches to your avatar).
    const { login } = useAuth()

    // navigate('/somewhere') = change page from code, e.g. after a
    // successful login. (A link needs a click; this doesn't.)
    const navigate = useNavigate()

    // If ProtectedRoute sent us here, it left a note in location.state
    // saying where you were trying to go.
    const location = useLocation()

    const [form, setForm] = useState({ username: '', password: '' })
    const [error, setError] = useState(null)
    const [saving, setSaving] = useState(false)

    // One handler for every input, matched by the input's `name`.
    function handleChange(event) {
        setForm({ ...form, [event.target.name]: event.target.value })
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setError(null)

        // Don't bother Django with an empty form.
        if (form.username.trim() === '' || form.password === '') {
            setError('Please fill in your email (or username) and password.')
            return
        }

        setSaving(true)

        try {
            await login(form.username, form.password)

            // ?. = "optional chaining". If location.state is null
            // (you clicked Log In in the header), this gives undefined
            // instead of crashing, and || falls back to the homepage.
            navigate(location.state?.from || '/')
        } catch (err) {
            // err.data is Django's answer, e.g.
            // { detail: 'Wrong email, username or password.' }.
            // If there's no err.data, the request never reached Django.
            setError(err.data?.detail || 'Could not reach the server. Is Django running?')
            setSaving(false)
        }
    }

    return (
        <AuthLayout>
            {/* ---------- THE CARD ---------- */}
            {/* noValidate: we show our own message instead of the
                browser's little "fill in this field" pop-up. */}
            <form
                onSubmit={handleSubmit}
                noValidate
                className={`${authStyles.card} w-full max-w-lg rounded-2xl border border-slate-800 p-8 text-white sm:p-10`}
            >
                <h1 className='text-3xl font-bold'>Sign in</h1>
                <p className='mt-2 text-gray-400'>Welcome back to Silent Evidence</p>

                {error && (
                    <p role='alert' className='mt-6 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200'>
                        {error}
                    </p>
                )}

                {/* ----- Email or username ----- */}
                <div className='mt-8'>
                    <label htmlFor='username' className={LABEL_STYLE}>Email or username</label>
                    {/* autoComplete tells the browser's password manager
                        what this box is, so it can fill it in for you. */}
                    <input
                        id='username'
                        name='username'
                        value={form.username}
                        onChange={handleChange}
                        autoComplete='username'
                        placeholder='you@example.com'
                        className={INPUT_STYLE}
                    />
                </div>

                {/* ----- Password ----- */}
                <div className='mt-6'>
                    {/* The label and "Forgot password?" on one line:
                        justify-between pushes them to the two ends. */}
                    <div className='mb-2 flex items-center justify-between'>
                        <label htmlFor='password' className='text-sm font-semibold text-gray-200'>Password</label>

                        {/* Opens ForgotPassword.jsx: we email a link
                            to choose a new password. */}
                        <Link to='/forgot-password' className='text-sm text-red-400 hover:text-red-300'>
                            Forgot password?
                        </Link>
                    </div>

                    {/* Our reusable password box with the eye button. */}
                    <PasswordInput
                        id='password'
                        name='password'
                        value={form.password}
                        onChange={handleChange}
                        autoComplete='current-password'
                        placeholder='Your password'
                    />
                </div>

                <button type='submit' disabled={saving} className={`${BUTTON_STYLE} mt-8 w-full`}>
                    {saving ? 'Signing in...' : 'Sign in'}
                </button>

                {/* border-t = the thin line above "Don't have an account?" */}
                <p className='mt-8 border-t border-slate-800 pt-8 text-center text-gray-400'>
                    Don't have an account?{' '}
                    <Link to='/signup' className='font-semibold text-red-500 hover:text-red-400'>Create one</Link>
                </p>
            </form>

            <p className='mt-8 text-center text-sm text-slate-500'>
                By signing in you agree to our Terms &amp; Privacy Policy
            </p>
        </AuthLayout>
    )
}

export default LogIn
