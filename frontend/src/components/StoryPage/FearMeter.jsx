import { useState } from 'react'
import { Skull } from 'lucide-react'
import { rateFear } from '../../api/client'
import { useRequireLogin } from '../../hooks/useRequireLogin'


// ---------------------------------------------------------------
// FEAR METER - "How scary was it?" 1 to 5 skulls.
//
//   <FearMeter storyId={story.id} initial={story.fear} canRate={!isMyStory} />
//
// initial = { average, votes, mine } from Django. Hovering previews
// your rating; clicking saves it (and you can change it later).
// Logged out -> Log In first.
// ---------------------------------------------------------------
const SCORES = [1, 2, 3, 4, 5]
const LABELS = ['', 'A little creepy', 'Unsettling', 'Scary', 'Terrifying', 'I slept with the lights on']


function FearMeter({ storyId, initial, canRate = true }) {
    const [fear, setFear] = useState(initial)
    // The skull under the mouse (0 = none) - for the preview.
    const [hovered, setHovered] = useState(0)
    const [error, setError] = useState('')
    const requireLogin = useRequireLogin()

    async function rate(score) {
        if (!requireLogin()) return
        setError('')
        try {
            setFear(await rateFear(storyId, score))
        } catch (err) {
            setError(err.data?.detail || 'Could not save your rating.')
        }
    }

    // What the skulls show: the preview while hovering, else your rating.
    const shown = hovered || fear.mine || 0

    return (
        <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                    <p className='font-bold text-white'>Fear meter</p>
                    <p className='text-sm text-gray-400'>
                        {fear.votes > 0
                            ? <><span className='font-semibold text-white'>{fear.average}</span> / 5 from {fear.votes} {fear.votes === 1 ? 'reader' : 'readers'}</>
                            : 'Nobody rated it yet.'}
                    </p>
                </div>

                {canRate && (
                    // onMouseLeave on the row: moving off it ends the preview.
                    <div className='flex items-center gap-1' onMouseLeave={() => setHovered(0)} role='group' aria-label='How scary was it?'>
                        {SCORES.map(score => (
                            <button
                                key={score}
                                type='button'
                                onClick={() => rate(score)}
                                onMouseEnter={() => setHovered(score)}
                                aria-label={`${score} of 5: ${LABELS[score]}`}
                                aria-pressed={fear.mine === score}
                                className='rounded p-1 transition-transform hover:scale-110'
                            >
                                <Skull className={`h-7 w-7 ${score <= shown ? 'text-red-500' : 'text-slate-600'}`} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {/* The words for the skull you're on - more fun than a number. */}
            {canRate && shown > 0 && <p className='mt-2 text-right text-sm text-red-300'>{LABELS[shown]}</p>}
            {error && <p className='mt-2 text-sm text-red-400'>{error}</p>}
        </div>
    )
}

export default FearMeter
