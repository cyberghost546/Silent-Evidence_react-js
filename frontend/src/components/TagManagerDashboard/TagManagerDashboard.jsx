import { useState, useEffect } from 'react'
import { Tag, Pencil, Trash2, Merge } from 'lucide-react'
import { getAdminList, updateAdminItem, deleteAdminItem, mergeTag } from '../../api/client'
import { AdminSearch, PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> TAG MANAGER (/dashboard/tags).
//
// Writers add tags on the Write a Story page. Over time you get
// near-duplicates ("haunted-house", "hauntedhouse", "haunted-houses").
// Tidy them up here:
//   Rename - fix a tag (renaming to a tag that exists = merge)
//   Merge  - move all its stories to another tag, then remove it
//   Delete - take the tag off every story
// ---------------------------------------------------------------

function TagRow({ tag, allTags, onDone, onError }) {
    // What this row is doing: nothing, renaming or merging.
    const [mode, setMode] = useState(null)
    const [name, setName] = useState(tag.name)
    const [intoId, setIntoId] = useState('')

    async function rename() {
        try {
            const answer = await updateAdminItem('tags', tag.id, { name })
            onDone(answer.detail)
        } catch (err) {
            onError(err.data?.detail || 'Could not rename.')
        }
    }

    async function merge() {
        const answer = await mergeTag(tag.id, intoId)
        onDone(answer.detail)
    }

    async function remove() {
        if (!window.confirm(`Delete #${tag.name}? It's removed from ${tag.story_count} ${tag.story_count === 1 ? 'story' : 'stories'}.`)) return
        await deleteAdminItem('tags', tag.id)
        onDone(`#${tag.name} deleted.`)
    }

    return (
        <li className='rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5'>
            <div className='flex items-center gap-3'>
                <span className='flex-1 font-mono text-sm text-white'>#{tag.name}</span>
                <span className='text-xs text-gray-500'>{tag.story_count} {tag.story_count === 1 ? 'story' : 'stories'}</span>
                <button type='button' onClick={() => setMode(mode === 'rename' ? null : 'rename')} aria-label='Rename' className='text-gray-400 hover:text-white'><Pencil className='h-4 w-4' /></button>
                <button type='button' onClick={() => setMode(mode === 'merge' ? null : 'merge')} aria-label='Merge into another tag' className='text-gray-400 hover:text-white'><Merge className='h-4 w-4' /></button>
                <button type='button' onClick={remove} aria-label='Delete' className='text-gray-500 hover:text-red-400'><Trash2 className='h-4 w-4' /></button>
            </div>

            {mode === 'rename' && (
                <div className='mt-2 flex gap-2'>
                    <input value={name} onChange={event => setName(event.target.value)} aria-label='New name' className='min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white focus:border-red-600 focus:outline-none' />
                    <button type='button' onClick={rename} className='rounded-md border border-slate-600 px-3 text-xs text-gray-200'>Save</button>
                </div>
            )}

            {mode === 'merge' && (
                <div className='mt-2 flex gap-2'>
                    <select value={intoId} onChange={event => setIntoId(event.target.value)} aria-label='Merge into' className='min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white [color-scheme:dark]'>
                        <option value=''>Merge into...</option>
                        {allTags.filter(other => other.id !== tag.id).map(other => (
                            <option key={other.id} value={other.id}>#{other.name}</option>
                        ))}
                    </select>
                    <button type='button' onClick={merge} disabled={!intoId} className='rounded-md border border-slate-600 px-3 text-xs text-gray-200 disabled:opacity-50'>Merge</button>
                </div>
            )}
        </li>
    )
}


function TagManagerDashboard() {
    const [tags, setTags] = useState(null)
    const [search, setSearch] = useState('')
    const [sortByUse, setSortByUse] = useState(true)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getAdminList('tags')
            .then(data => setTags(data))
            .catch(() => setError('Could not load the tags.'))
    }, [reloadKey])

    function handleDone(message) {
        setError('')
        setNotice(message)
        setReloadKey(current => current + 1)
    }

    if (!tags) return <p className='text-gray-400'>{error || 'Loading...'}</p>

    const words = search.trim().toLowerCase()
    const shown = tags
        .filter(tag => tag.name.includes(words))
        // A COPY is sorted (filter already made a new list).
        .sort((a, b) => (sortByUse ? b.story_count - a.story_count : a.name.localeCompare(b.name)))
    const unused = tags.filter(tag => tag.story_count === 0).length

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Tag className='h-7 w-7 text-red-500' />
                Tag Manager
            </h1>
            <p className='mt-1 text-gray-400'>{tags.length} tags{unused > 0 && ` · ${unused} not used by any story`}.</p>

            <PageMessages error={error} notice={notice} />

            <div className='mt-6 flex flex-wrap items-center gap-3'>
                <AdminSearch value={search} onChange={setSearch} placeholder='Find a tag...' />
                <button type='button' onClick={() => setSortByUse(!sortByUse)} className='rounded-full border border-slate-700 px-4 py-2 text-sm text-gray-300 hover:border-slate-500'>
                    Sort: {sortByUse ? 'most used' : 'A-Z'}
                </button>
            </div>

            <ul className='mt-4 space-y-2'>
                {shown.length === 0 && <li className='text-sm text-gray-500'>No tags yet - writers add them on the Write a Story page.</li>}
                {shown.map(tag => (
                    <TagRow key={tag.id} tag={tag} allTags={tags} onDone={handleDone} onError={setError} />
                ))}
            </ul>
        </div>
    )
}

export default TagManagerDashboard
