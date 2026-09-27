import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { confirmAge } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import BirthDateForm from '../AgeCheck/BirthDateForm'


// ---------------------------------------------------------------
// THE LOCK SCREEN on an 18+ story you can't read (yet).
// Shown by StoryPage INSTEAD of the story's text.
//
//   <StoryLock lock={story.lock} onUnlocked={() => loadTheStoryAgain()} />
//
// lock comes from Django (accounts/age.py -> story_lock):
//   'login'     - logged out: log in first (your age belongs to your account)
//   'age'       - logged in, age not confirmed yet: pick your birth date
//   'too_young' - under 18: sorry
//
// Django didn't even send the text, so there's nothing hidden in the
// page to peek at - this screen is the only thing there is.
// ---------------------------------------------------------------
function StoryLock({ lock, onUnlocked }) {
    const location = useLocation()
    const { refreshUser } = useAuth()
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    // After confirming an age under 18.
    const [tooYoung, setTooYoung] = useState(lock === 'too_young')

    async function handleBirthDate(isoDate) {
        setSending(true)
        setError('')
        try {
            const answer = await confirmAge(isoDate)
            // The header, Settings etc. should know right away too.
            refreshUser()
            if (answer.is_adult) onUnlocked()
            else setTooYoung(true)
        } catch (err) {
            setError(err.data?.birth_date?.[0] || err.data?.detail || 'Something went wrong. Try again.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className='mt-8 rounded-2xl border border-red-900/60 bg-red-950/20 px-6 py-10 text-center'>
            <Lock className='mx-auto h-10 w-10 text-red-500' />
            <p className='mt-2 inline-block rounded bg-red-600 px-2 py-0.5 text-xs font-extrabold text-white'>18+</p>

            {tooYoung ? (
                <>
                    <h2 className='mt-3 text-xl font-bold text-white'>This story is for readers 18 and over</h2>
                    <p className='mt-2 text-sm text-gray-400'>
                        There are lots of stories for you on the site - try one of the stories below.
                    </p>
                </>
            ) : (
                <>
                    <h2 className='mt-3 text-xl font-bold text-white'>This story is for readers 18 and over</h2>
                    <p className='mx-auto mt-2 max-w-md text-sm text-gray-400'>
                        It contains mature and disturbing content.
                        {lock === 'login'
                            ? ' Log in (or sign up) and confirm your age to read it.'
                            : " Confirm your age once and you can read every 18+ story."}
                    </p>

                    {lock === 'login' ? (
                        // state.from = come back to THIS story after logging in.
                        <div className='mt-6 flex justify-center gap-3'>
                            <Link to='/login' state={{ from: location.pathname }} className='rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700'>Log in</Link>
                            <Link to='/signup' className='rounded-lg border border-slate-600 px-5 py-2.5 text-sm text-gray-200 hover:border-slate-400'>Sign up</Link>
                        </div>
                    ) : (
                        <div className='mx-auto mt-6 max-w-sm'>
                            <BirthDateForm onSubmit={handleBirthDate} sending={sending} buttonText='Confirm my age' />
                            {error && <p className='mt-2 text-sm text-red-400'>{error}</p>}
                            <p className='mt-3 text-xs text-gray-500'>
                                You can only do this once, so please be honest. Your birth date isn't shown to anyone.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default StoryLock
