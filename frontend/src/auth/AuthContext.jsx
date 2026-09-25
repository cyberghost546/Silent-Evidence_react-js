import { useState, useEffect } from 'react'
import { AuthContext } from '../hooks/useAuth'
import { getCurrentUser, loginRequest, signupRequest, logoutRequest } from '../api/client'


// ---------------------------------------------------------------
// WHY A CONTEXT?
//
// Before, `user` lived in Header's useState. But now the Log In page,
// the Sign Up page, the UserMenu AND the dashboard guard all need to
// know who's logged in. Passing it down as props through every
// component in between ("prop drilling") gets messy fast.
//
// A context is a value that ANY component inside the provider can
// read directly with useAuth(), no matter how deep it is.
//
// Three pieces:
//   1. AuthContext  - the "channel" (hooks/useAuth.js)
//   2. AuthProvider - THIS file. Wraps the app in main.jsx and
//                     holds the state
//   3. useAuth()    - how components read it (hooks/useAuth.js)
// ---------------------------------------------------------------

export function AuthProvider({ children }) {
    // null = logged out. An object like
    // { id, username, email, is_staff } = logged in.
    const [user, setUser] = useState(null)

    // True until we've asked Django "is anyone already logged in?".
    // Without this, a logged-in admin who refreshes /dashboard would
    // get kicked to /login for a split second before the answer came.
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getCurrentUser()
            .then(data => setUser(data))
            .catch(err => console.error('Could not check login:', err))
            .finally(() => setLoading(false))
    }, [])

    // These three talk to Django and then update `user`. Every
    // component that uses useAuth() re-renders automatically.
    //
    // If Django says no (wrong password etc.), the error is NOT caught
    // here - it goes back to the form that called us, so the form can
    // show the message.
    async function login(username, password) {
        const data = await loginRequest(username, password)
        setUser(data)
    }

    async function signup(username, email, password) {
        const data = await signupRequest(username, email, password)
        setUser(data)
    }

    async function logout() {
        try {
            await logoutRequest()
        } catch (err) {
            console.error('Logout failed:', err)
        }
        // Log out on the screen even if the request failed.
        setUser(null)
    }

    // Ask Django again "who is logged in?". The Settings page calls
    // this after you change your username or avatar (so the Header
    // shows the new one), and after deleting your account (Django
    // then answers "nobody" -> null).
    async function refreshUser() {
        const data = await getCurrentUser()
        setUser(data)
    }

    // `value` is what useAuth() hands back to components.
    // {children} = whatever is between <AuthProvider> and
    // </AuthProvider> in main.jsx (the whole app).
    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}
