import { useState } from 'react'
import { X, Plus, Check, Lock } from 'lucide-react'
import { getMyReadingLists, addToReadingList, removeFromReadingList, createReadingList } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { INPUT_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// "Add to a reading list" - the pop-up from a story's Actions menu.
//
// Every list you have, with a tick if this story is in it. Click a
// list to add / take out the story. At the bottom: make a new list
// (the story goes straight into it).
//
// Usage:
//   {open && <AddToListDialog storyId={story.id} onClose={() => setOpen(false)} />}
// ---------------------------------------------------------------
function AddToListDialog({ storyId, onClose }) {
    const { data: lists, setData: setLists, error } = useApi(() => getMyReadingLists(storyId))
    const [newTitle, setNewTitle] = useState('')
    const [problem, setProblem] = useState('')

    async function toggle(list) {
        setProblem('')
        try {
            if (list.has_story) {
                await removeFromReadingList(list.id, storyId)
            } else {
                await addToReadingList(list.id, storyId)
            }
            // Flip the tick and the count on screen straight away.
            setLists(lists.map(item => item.id === list.id
                ? { ...item, has_story: !item.has_story, story_count: item.story_count + (item.has_story ? -1 : 1) }
                : item))
        } catch (err) {
            setProblem(err.data?.detail || 'That did not work.')
        }
    }

    async function handleCreate(event) {
        event.preventDefault()
        setProblem('')
        try {
            const list = await createReadingList({ title: newTitle.trim(), is_public: true })
            await addToReadingList(list.id, storyId)
            setLists([{ ...list, has_story: true, story_count: 1 }, ...lists])
            setNewTitle('')
        } catch (err) {
            setProblem(err.data?.detail || 'Could not make the list.')
        }
    }

    return (
        // The dark see-through background. Clicking it closes the dialog.
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4' onClick={onClose}>
            {/* stopPropagation: a click INSIDE the box must not reach the
                background (which would close it). */}
            <div
                role='dialog'
                aria-modal='true'
                aria-label='Add to a reading list'
                onClick={event => event.stopPropagation()}
                className='w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl'
            >
                <div className='flex items-center justify-between'>
                    <h2 className='font-bold text-white'>Add to a reading list</h2>
                    <button type='button' onClick={onClose} aria-label='Close' className='text-gray-400 hover:text-white'>
                        <X className='h-5 w-5' />
                    </button>
                </div>

                {error && <p className='mt-4 text-sm text-red-400'>{error}</p>}
                {lists?.length === 0 && <p className='mt-4 text-sm text-gray-400'>You have no lists yet - make your first one below.</p>}

                <ul className='mt-4 max-h-64 space-y-1 overflow-y-auto'>
                    {lists?.map(list => (
                        <li key={list.id}>
                            <button
                                type='button'
                                onClick={() => toggle(list)}
                                aria-pressed={list.has_story}
                                className='flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-800'
                            >
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${list.has_story ? 'border-red-600 bg-red-600' : 'border-slate-600'}`}>
                                    {list.has_story && <Check className='h-3.5 w-3.5 text-white' />}
                                </span>
                                <span className='min-w-0 flex-1 truncate text-gray-200'>{list.title}</span>
                                {!list.is_public && <Lock className='h-3.5 w-3.5 text-gray-500' aria-label='Private' />}
                                <span className='text-xs text-gray-500'>{list.story_count}</span>
                            </button>
                        </li>
                    ))}
                </ul>

                <form onSubmit={handleCreate} className='mt-4 flex gap-2 border-t border-slate-800 pt-4'>
                    <input
                        value={newTitle}
                        onChange={event => setNewTitle(event.target.value)}
                        maxLength={100}
                        placeholder='New list, e.g. "Winter reads"'
                        aria-label='New list name'
                        className={`${INPUT_STYLE} !py-2 text-sm`}
                    />
                    <button type='submit' disabled={!newTitle.trim()} aria-label='Make list' className='rounded-lg bg-red-600 px-3 text-white hover:bg-red-700 disabled:opacity-50'>
                        <Plus className='h-4 w-4' />
                    </button>
                </form>
                {problem && <p className='mt-2 text-sm text-red-400'>{problem}</p>}
            </div>
        </div>
    )
}

export default AddToListDialog
