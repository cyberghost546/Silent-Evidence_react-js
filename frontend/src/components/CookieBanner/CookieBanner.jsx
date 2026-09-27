import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cookie } from 'lucide-react'
import { getCookieBanner, sendCookieChoice } from '../../api/client'


// ---------------------------------------------------------------
// The cookie banner - a small box at the bottom of the page until
// the visitor picks "Accept all" or "Essential only".
//
// Admins write the text and switch it on/off on
// Admin Dashboard -> Cookie Consent, and see how people chose.
//
// The choice is remembered in THIS browser (localStorage), so the
// banner doesn't come back. Django only COUNTS the choices - it
// never stores who chose what.
//
// (Today the site only uses essential cookies, so both buttons do
// the same thing. The choice is saved so that if you ever add
// analytics, you can respect it: only load them for 'all'.)
// ---------------------------------------------------------------

const COOKIE_CHOICE_KEY = 'cookieChoice'

function savedChoice() {
    try {
        return localStorage.getItem(COOKIE_CHOICE_KEY)
    } catch {
        return null
    }
}


function CookieBanner() {
    // Show nothing until we know the admin switched it on, and only
    // if this browser hasn't chosen yet.
    const [banner, setBanner] = useState(null)
    const [chosen, setChosen] = useState(() => savedChoice() !== null)

    useEffect(() => {
        if (chosen) return   // already chose: don't even ask Django
        getCookieBanner()
            .then(data => setBanner(data))
            .catch(() => {})
    }, [chosen])

    function choose(choice) {
        try {
            localStorage.setItem(COOKIE_CHOICE_KEY, choice)
        } catch {
            // Can't save: the banner may show again next visit. Fine.
        }
        sendCookieChoice(choice).catch(() => {})   // counting is best-effort
        setChosen(true)
    }

    if (chosen || !banner?.is_enabled) return null

    return (
        // fixed bottom-4 left-4: bottom-LEFT, so it doesn't cover the
        // "back to top" button or the Site Guide tour on the right.
        <div
            role='dialog'
            aria-label='Cookie choice'
            className='fixed bottom-4 left-4 right-4 z-40 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-black/60 sm:right-auto sm:max-w-sm'
        >
            <p className='flex items-center gap-2 font-semibold text-white'>
                <Cookie className='h-5 w-5 text-amber-400' />
                Cookies
            </p>
            <p className='mt-2 text-sm text-gray-300'>{banner.message}</p>
            <Link to='/cookies' className='mt-1 inline-block text-xs text-red-400 hover:text-red-300'>Read the cookie policy</Link>

            <div className='mt-4 flex gap-2'>
                <button type='button' onClick={() => choose('all')} className='flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700'>
                    Accept all
                </button>
                <button type='button' onClick={() => choose('essential')} className='flex-1 rounded-lg border border-slate-600 py-2 text-sm text-gray-200 hover:border-slate-400'>
                    Essential only
                </button>
            </div>
        </div>
    )
}

export default CookieBanner
