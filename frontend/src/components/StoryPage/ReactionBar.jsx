import { useState } from 'react'
import { toggleReaction } from '../../api/client'
import { useRequireLogin } from '../../hooks/useRequireLogin'


// ---------------------------------------------------------------
// REACTIONS - how did the story land? Next to the Like button.
//
//   <ReactionBar storyId={story.id} initial={story.reactions} />
//
// initial = { counts: { got_me: 3, ... }, mine: ['got_me'] } from
// Django. Click = on, click again = off. The names match
// REACTION_KINDS in stories/models.py.
// ---------------------------------------------------------------
const REACTIONS = [
    { kind: 'got_me', emoji: '😱', label: 'Got me' },
    { kind: 'cant_sleep', emoji: '🌙', label: "Can't sleep" },
    { kind: 'creepy', emoji: '🕯️', label: 'Creepy' },
]


function ReactionBar({ storyId, initial }) {
    const [reactions, setReactions] = useState(initial)
    const requireLogin = useRequireLogin()

    async function toggle(kind) {
        if (!requireLogin()) return
        try {
            setReactions(await toggleReaction(storyId, kind))
        } catch {
            // Not important enough for an error message - just try again.
        }
    }

    return (
        <div className='flex flex-wrap gap-2'>
            {REACTIONS.map(reaction => {
                const isMine = reactions.mine.includes(reaction.kind)
                return (
                    <button
                        key={reaction.kind}
                        type='button'
                        onClick={() => toggle(reaction.kind)}
                        aria-pressed={isMine}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            isMine ? 'border-red-700 bg-red-950/50 text-white' : 'border-slate-700 text-gray-300 hover:border-slate-500'
                        }`}
                    >
                        {/* aria-hidden: screen readers read the label, not the emoji's name. */}
                        <span aria-hidden='true'>{reaction.emoji}</span>
                        {reaction.label}
                        <span className='tabular-nums text-gray-400'>{reactions.counts[reaction.kind]}</span>
                    </button>
                )
            })}
        </div>
    )
}

export default ReactionBar
