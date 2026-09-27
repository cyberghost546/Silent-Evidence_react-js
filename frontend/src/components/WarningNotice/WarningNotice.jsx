import { useState, useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getMyWarnings, acknowledgeWarning } from '../../api/client'


// ---------------------------------------------------------------
// A warning from the moderators (Admin Dashboard -> Warnings & Bans).
//
// If the logged-in member has a warning they haven't confirmed yet,
// this pop-up covers the page until they press "I understand".
// Several warnings? They're shown one at a time.
//
// It lives in SiteLayout, so it shows on whichever page they open.
// ---------------------------------------------------------------
function WarningNotice() {
    const { user } = useAuth()
    const [warnings, setWarnings] = useState([])

    // Ask again whenever the logged-in user changes.
    useEffect(() => {
        if (!user) return
        getMyWarnings()
            .then(data => setWarnings(data))
            .catch(() => {})
    }, [user])

    // Logged out -> not shown, even if warnings were loaded before.
    if (!user || warnings.length === 0) return null

    // The oldest first: the list is newest first, so take the last.
    const warning = warnings[warnings.length - 1]

    async function handleOk() {
        try {
            await acknowledgeWarning(warning.id)
        } catch {
            // Even if saving failed, let them use the site.
        }
        // Take it off the list; the next one (if any) shows.
        setWarnings(warnings.filter(item => item.id !== warning.id))
    }

    return (
        <div role='alertdialog' aria-modal='true' aria-label='Warning from the moderators' className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4'>
            <div className='w-full max-w-md rounded-2xl border border-amber-700 bg-slate-900 p-6 shadow-2xl'>
                <p className='flex items-center gap-2 text-lg font-bold text-amber-300'>
                    <TriangleAlert className='h-6 w-6' />
                    A warning from the moderators
                </p>
                <p className='mt-4 whitespace-pre-line text-gray-200'>{warning.message}</p>
                <p className='mt-3 text-xs text-gray-500'>
                    {new Date(warning.created_at).toLocaleString()}. Repeated problems can lead to a ban.
                    Questions? Open a ticket on the Help &amp; Support page.
                </p>
                <button type='button' onClick={handleOk} className='mt-6 w-full rounded-lg bg-amber-600 py-2.5 font-semibold text-black hover:bg-amber-500'>
                    I understand
                </button>
            </div>
        </div>
    )
}

export default WarningNotice
