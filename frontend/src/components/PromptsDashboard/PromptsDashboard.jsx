import { useState, useEffect } from 'react'
import { PenLine, Trash2 } from 'lucide-react'
import { getAdminList, createAdminItem, updateAdminItem, deleteAdminItem } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> WRITING PROMPTS (/dashboard/prompts).
//
// Short story ideas. The Write a Story page shows a random ACTIVE
// one in its "Need an idea?" box. Switch a prompt off to rest it
// without deleting it.
//
// The simplest admin page there is: a text box to add, and a list
// with On/Off and Delete. A good one to copy for other simple lists.
// ---------------------------------------------------------------
function PromptsDashboard() {
    const [prompts, setPrompts] = useState(null)
    const [text, setText] = useState('')
    const [error, setError] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getAdminList('prompts')
            .then(data => setPrompts(data))
            .catch(() => setError('Could not load the prompts.'))
    }, [reloadKey])

    async function handleAdd(event) {
        event.preventDefault()
        try {
            await createAdminItem('prompts', { text: text.trim() })
            setText('')
            reload()
        } catch {
            setError('Could not add the prompt.')
        }
    }

    async function toggle(prompt) {
        await updateAdminItem('prompts', prompt.id, { is_active: !prompt.is_active })
        reload()
    }

    async function remove(prompt) {
        if (!window.confirm('Delete this prompt?')) return
        await deleteAdminItem('prompts', prompt.id)
        reload()
    }

    const activeCount = prompts?.filter(prompt => prompt.is_active).length ?? 0

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <PenLine className='h-7 w-7 text-red-500' />
                Writing Prompts
            </h1>
            <p className='mt-1 text-gray-400'>
                Ideas for writers - a random active one appears on the Write a Story page. {activeCount} active.
            </p>

            <PageMessages error={error} notice='' />

            <form onSubmit={handleAdd} className='mt-6 flex gap-2'>
                <input
                    value={text}
                    onChange={event => setText(event.target.value)}
                    maxLength={300}
                    placeholder='e.g. Your smart speaker starts answering questions nobody asked.'
                    aria-label='New prompt'
                    className={INPUT_STYLE}
                />
                <button type='submit' disabled={!text.trim()} className={`${BUTTON_STYLE} shrink-0`}>Add</button>
            </form>

            <ul className='mt-6 space-y-2'>
                {prompts?.map(prompt => (
                    <li
                        key={prompt.id}
                        className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                            prompt.is_active ? 'border-slate-800 bg-slate-900/60' : 'border-slate-800/60 opacity-50'
                        }`}
                    >
                        <p className='flex-1 text-sm text-gray-200'>{prompt.text}</p>
                        <button
                            type='button'
                            onClick={() => toggle(prompt)}
                            className={`shrink-0 rounded-full border px-3 py-0.5 text-xs font-semibold ${
                                prompt.is_active ? 'border-green-800 text-green-400' : 'border-slate-600 text-gray-400'
                            }`}
                        >
                            {prompt.is_active ? 'On' : 'Off'}
                        </button>
                        <button type='button' onClick={() => remove(prompt)} aria-label='Delete prompt' className='shrink-0 text-gray-500 hover:text-red-400'>
                            <Trash2 className='h-4 w-4' />
                        </button>
                    </li>
                ))}
                {prompts?.length === 0 && <p className='text-sm text-gray-500'>No prompts yet - add the first one above.</p>}
            </ul>
        </div>
    )
}

export default PromptsDashboard
