import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'


// ---------------------------------------------------------------
// THE LOCK SCREEN for a story in its Pro early-access hours.
// Shown by StoryPage INSTEAD of the text, when lock === 'early_access'.
//
//   <EarlyAccessLock opensAt={story.early_access_until} />
//
// Like the 18+ lock (StoryLock.jsx): Django didn't send the text at
// all, so there's nothing hidden in the page to peek at.
// ---------------------------------------------------------------
function EarlyAccessLock({ opensAt }) {
    const { user } = useAuth()

    // "Saturday 21:00" - the visitor's own day names and clock.
    const when = new Date(opensAt).toLocaleString(undefined, {
        weekday: 'long', hour: '2-digit', minute: '2-digit',
    })

    return (
        <div className='mt-8 rounded-2xl border border-yellow-700/60 bg-yellow-950/20 px-6 py-10 text-center'>
            <Crown className='mx-auto h-10 w-10 text-yellow-400' />
            <p className='mt-2 inline-block rounded bg-yellow-400 px-2 py-0.5 text-xs font-extrabold text-black'>PRO EARLY</p>

            <h2 className='mt-3 text-xl font-bold text-white'>Pro readers are reading this one first</h2>
            <p className='mx-auto mt-2 max-w-md text-sm text-gray-400'>
                It opens for everyone on <span className='font-semibold text-gray-200'>{when}</span>.
                Can't wait? Pro readers get every early-access story straight away.
            </p>

            <div className='mt-6 flex flex-wrap justify-center gap-3'>
                <Link to='/premium' className='rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700'>
                    See Pro
                </Link>
                {!user && (
                    // Already Pro but logged out? Logging in is enough.
                    <Link to='/login' className='rounded-full border border-slate-600 px-5 py-2.5 text-sm text-gray-200 hover:border-slate-400'>
                        Log in
                    </Link>
                )}
            </div>
        </div>
    )
}

export default EarlyAccessLock
