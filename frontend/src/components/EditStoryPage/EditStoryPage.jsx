import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { History, RotateCcw } from 'lucide-react'
import { getStoryForEdit, saveStoryEdit, getStoryVersions, restoreStoryVersion } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatLongDate, timeAgo } from '../../utils/format'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import StoryEditor from '../WriteStory/StoryEditor'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// EDIT YOUR STORY (/my-stories/:id/edit) - logged in only (App.jsx).
//
// Left: title, excerpt and the text (the same editor as Write a Story).
// Right: VERSION HISTORY - every save keeps the text from before, so
// you can look at an old version and put it back ("Restore").
// Django: stories/edit_views.py. Someone else's story -> not found.
// ---------------------------------------------------------------

// The form, started from what Django sent. Its own component, so it
// can start its useState from `story` (the parent waits for it to load).
function EditForm({ story, onSaved }) {
    const [form, setForm] = useState({ title: story.title, excerpt: story.excerpt, body: story.body })
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    function update(name, value) {
        setForm(current => ({ ...current, [name]: value }))
        setMessage('')
    }

    async function handleSave(event) {
        event.preventDefault()
        setSaving(true)
        setError('')
        try {
            const saved = await saveStoryEdit(story.id, form)
            setForm({ title: saved.title, excerpt: saved.excerpt, body: saved.body })
            setMessage('Saved. The previous version is in the history.')
            onSaved()
        } catch (err) {
            setError(err.data?.detail || 'Could not save.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSave} className='space-y-5'>
            <div>
                <label htmlFor='edit-title' className={LABEL_STYLE}>Title</label>
                <input id='edit-title' value={form.title} onChange={event => update('title', event.target.value)} maxLength={200} className={INPUT_STYLE} />
            </div>
            <div>
                <label htmlFor='edit-excerpt' className={LABEL_STYLE}>Excerpt <span className='font-normal text-gray-500'>(optional)</span></label>
                <input id='edit-excerpt' value={form.excerpt} onChange={event => update('excerpt', event.target.value)} maxLength={300} className={INPUT_STYLE} />
            </div>
            <div>
                <label htmlFor='edit-body' className={LABEL_STYLE}>Your story</label>
                <StoryEditor id='edit-body' value={form.body} onChange={value => update('body', value)} />
            </div>
            {error && <p className='text-sm text-red-400'>{error}</p>}
            {message && <p className='text-sm text-green-400'>{message}</p>}
            <div className='flex items-center gap-4'>
                <button type='submit' disabled={saving} className={BUTTON_STYLE}>{saving ? 'Saving...' : 'Save changes'}</button>
                <Link to={`/stories/${story.id}`} className='text-sm text-gray-400 hover:text-white'>View story</Link>
            </div>
        </form>
    )
}


function EditStoryPage() {
    const { id } = useParams()
    usePageTitle('Edit story')
    // editKey changes after a save or restore -> the form starts again
    // from the new text, and the history reloads.
    const [editKey, setEditKey] = useState(0)
    const { data: story, error } = useApi(() => getStoryForEdit(id), [id, editKey])
    const { data: versions, reload: reloadVersions } = useApi(() => getStoryVersions(id), [id])
    const [openVersion, setOpenVersion] = useState(null)

    if (error) return <PageLayout title='Edit story'><PageMessage title='Story not found' text='You can only edit your own stories.' /></PageLayout>
    if (!story) return <PageLayout title='Edit story'><PageMessage title='Loading...' /></PageLayout>

    async function handleRestore(version) {
        if (!window.confirm(`Put back the version from ${formatLongDate(version.saved_at)}? The text you have now is kept in the history.`)) return
        await restoreStoryVersion(story.id, version.id)
        setOpenVersion(null)
        setEditKey(key => key + 1)
        reloadVersions()
    }

    return (
        <PageLayout title='Edit story' subtitle={story.title}>
            <div className='grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]'>
                <EditForm key={editKey} story={story} onSaved={reloadVersions} />

                {/* ---------- VERSION HISTORY ---------- */}
                <aside>
                    <h2 className='flex items-center gap-2 font-bold text-white'>
                        <History className='h-5 w-5 text-red-500' /> Version history
                    </h2>
                    {versions?.length === 0 && <p className='mt-3 text-sm text-gray-400'>No older versions yet. Every time you save, the text from before is kept here.</p>}
                    <ul className='mt-3 space-y-2'>
                        {versions?.map(version => (
                            <li key={version.id} className='rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm'>
                                <p className='font-semibold text-gray-200'>{timeAgo(version.saved_at)}</p>
                                <p className='text-xs text-gray-400'>{version.words} words · &quot;{version.title}&quot;</p>
                                <div className='mt-2 flex gap-3 text-xs'>
                                    <button type='button' onClick={() => setOpenVersion(openVersion === version.id ? null : version.id)} aria-expanded={openVersion === version.id} className='text-red-300 hover:text-red-200'>
                                        {openVersion === version.id ? 'Hide' : 'Read'}
                                    </button>
                                    <button type='button' onClick={() => handleRestore(version)} className='flex items-center gap-1 text-gray-300 hover:text-white'>
                                        <RotateCcw className='h-3 w-3' /> Restore
                                    </button>
                                </div>
                                {openVersion === version.id && (
                                    <p className='mt-2 max-h-64 overflow-y-auto whitespace-pre-line rounded bg-slate-950 p-2 text-xs leading-relaxed text-gray-300'>{version.body}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
        </PageLayout>
    )
}

export default EditStoryPage
