import { useState, useEffect } from 'react'
import { Lightbulb, RefreshCw } from 'lucide-react'
import { getRandomPrompt } from '../../api/client'


// ---------------------------------------------------------------
// "Need an idea?" on the Write a Story page: one random writing
// prompt, and a button for another one.
//
// Admins write the prompts on Admin Dashboard -> Writing Prompts.
// No active prompts = this box doesn't show at all.
//
// Usage:
//   <PromptBox onUse={text => ...} />
// onUse is called when the writer clicks "Use it" - the Write page
// puts the prompt in the story as a starting line.
// ---------------------------------------------------------------
function PromptBox({ onUse }) {
    // undefined = loading, null = no prompts, else { id, text }
    const [prompt, setPrompt] = useState(undefined)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getRandomPrompt()
            .then(data => setPrompt(data))
            .catch(() => setPrompt(null))
    }, [reloadKey])

    // Loading or nothing there: show nothing.
    if (!prompt) return null

    return (
        <div className='mt-5 flex items-start gap-3 rounded-lg border border-yellow-900/60 bg-yellow-950/20 px-4 py-3'>
            <Lightbulb className='mt-0.5 h-5 w-5 shrink-0 text-yellow-400' />
            <div className='flex-1'>
                <p className='text-xs font-semibold uppercase tracking-wider text-yellow-500'>Writing prompt</p>
                <p className='mt-1 text-sm text-gray-200'>{prompt.text}</p>
                <div className='mt-2 flex gap-4 text-xs'>
                    <button type='button' onClick={() => onUse(prompt.text)} className='font-semibold text-yellow-400 hover:text-yellow-300'>
                        Use it
                    </button>
                    {/* A new reloadKey = ask Django for another random one. */}
                    <button type='button' onClick={() => setReloadKey(reloadKey + 1)} className='flex items-center gap-1 text-gray-400 hover:text-white'>
                        <RefreshCw className='h-3 w-3' /> Another one
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PromptBox
