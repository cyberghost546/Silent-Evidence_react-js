import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Pencil, Trash2 } from 'lucide-react'
import { getAdminList, getStoryPicker, createAdminItem, updateAdminItem, deleteAdminItem } from '../../api/client'
import { AdminSearch, PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> BUNDLES (/dashboard/bundles).
//
// Hand-picked story collections, like "Best of Haunted Houses".
// Published bundles appear on the public /bundles page.
//
// The form is used for both adding and editing (like Categories).
// Picking stories = ticking checkboxes in a list of every published
// story. Django gets the ticked ids as story_ids: [3, 7, 12].
// ---------------------------------------------------------------

const EMPTY_FORM = { title: '', slug: '', description: '', is_published: false, story_ids: [] }

function makeSlug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}


function BundlesDashboard() {
    const [bundles, setBundles] = useState(null)
    const [allStories, setAllStories] = useState([])
    const [form, setForm] = useState(EMPTY_FORM)
    const [editingId, setEditingId] = useState(null)
    const [storySearch, setStorySearch] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getAdminList('bundles')
            .then(data => setBundles(data))
            .catch(() => setError('Could not load the bundles.'))
    }, [reloadKey])

    // The stories to pick from - loaded once.
    useEffect(() => {
        getStoryPicker().then(data => setAllStories(data)).catch(() => {})
    }, [])

    function updateForm(name, value) {
        setForm(current => {
            const next = { ...current, [name]: value }
            if (name === 'title' && editingId === null) next.slug = makeSlug(value)
            return next
        })
    }

    // Tick / untick one story.
    function toggleStory(id) {
        setForm(current => ({
            ...current,
            story_ids: current.story_ids.includes(id)
                ? current.story_ids.filter(storyId => storyId !== id)
                : [...current.story_ids, id],
        }))
    }

    function startEditing(bundle) {
        setEditingId(bundle.id)
        setForm({
            title: bundle.title,
            slug: bundle.slug,
            description: bundle.description,
            is_published: bundle.is_published,
            story_ids: bundle.story_ids,
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function cancelEditing() {
        setEditingId(null)
        setForm(EMPTY_FORM)
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')
        try {
            // A plain object (not FormData) -> sent as JSON, so the
            // story_ids LIST arrives in one piece (see authRequest).
            if (editingId === null) {
                await createAdminItem('bundles', form)
            } else {
                await updateAdminItem('bundles', editingId, form)
            }
            setNotice(`"${form.title}" saved.`)
            cancelEditing()
            reload()
        } catch (err) {
            setError(err.data ? Object.values(err.data).flat().join(' ') : 'Could not save the bundle.')
        }
    }

    async function handleDelete(bundle) {
        if (!window.confirm(`Delete "${bundle.title}"? The stories stay.`)) return
        await deleteAdminItem('bundles', bundle.id)
        reload()
    }

    const words = storySearch.trim().toLowerCase()
    const pickable = allStories.filter(story => words === '' || story.title.toLowerCase().includes(words) || story.author.toLowerCase().includes(words))

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Package className='h-7 w-7 text-red-500' />
                Bundles
            </h1>
            <p className='mt-1 text-gray-400'>
                Story collections. Published ones are on the public <Link to='/bundles' className='text-red-400 hover:text-red-300'>Bundles page</Link>.
            </p>

            <PageMessages error={error} notice={notice} />

            <form onSubmit={handleSubmit} className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <h2 className='font-semibold text-white'>{editingId === null ? 'New bundle' : `Edit "${form.title}"`}</h2>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div>
                        <label htmlFor='title' className={LABEL_STYLE}>Title</label>
                        <input id='title' value={form.title} onChange={event => updateForm('title', event.target.value)} maxLength={150} placeholder='Best of Haunted Houses' className={INPUT_STYLE} />
                    </div>
                    <div>
                        <label htmlFor='slug' className={LABEL_STYLE}>URL name <span className='font-normal text-gray-500'>(/bundles/…)</span></label>
                        <input id='slug' value={form.slug} onChange={event => updateForm('slug', makeSlug(event.target.value))} className={INPUT_STYLE} />
                    </div>
                </div>

                <div>
                    <label htmlFor='description' className={LABEL_STYLE}>Description</label>
                    <textarea id='description' value={form.description} onChange={event => updateForm('description', event.target.value)} rows={2} maxLength={1000} className={`${INPUT_STYLE} resize-y`} />
                </div>

                {/* ---------- PICK THE STORIES ---------- */}
                <div>
                    <p className={LABEL_STYLE}>Stories ({form.story_ids.length} picked)</p>
                    <AdminSearch value={storySearch} onChange={setStorySearch} placeholder='Find a story...' />
                    {/* max-h + overflow-y-auto = a box that scrolls
                        by itself when there are many stories. */}
                    <div className='menu-scroll mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-800 p-2'>
                        {pickable.map(story => (
                            <label key={story.id} className='flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-slate-800'>
                                <input
                                    type='checkbox'
                                    checked={form.story_ids.includes(story.id)}
                                    onChange={() => toggleStory(story.id)}
                                    className='h-4 w-4 accent-red-600'
                                />
                                <span className='text-gray-200'>{story.title}</span>
                                <span className='text-xs text-gray-500'>by {story.author}</span>
                            </label>
                        ))}
                        {pickable.length === 0 && <p className='px-2 py-1 text-sm text-gray-500'>No published stories match.</p>}
                    </div>
                </div>

                <label className='flex items-center gap-2 text-sm text-gray-300'>
                    <input type='checkbox' checked={form.is_published} onChange={event => updateForm('is_published', event.target.checked)} className='h-4 w-4 accent-red-600' />
                    Published (visible on the site)
                </label>

                <div className='flex gap-2'>
                    <button type='submit' disabled={!form.title.trim() || !form.slug} className={BUTTON_STYLE}>
                        {editingId === null ? 'Create bundle' : 'Save changes'}
                    </button>
                    {editingId !== null && (
                        <button type='button' onClick={cancelEditing} className='rounded-lg border border-slate-600 px-4 text-sm text-gray-300 hover:border-slate-400'>Cancel</button>
                    )}
                </div>
            </form>

            <ul className='mt-8 space-y-3'>
                {bundles?.map(bundle => (
                    <li key={bundle.id} className='flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4'>
                        <div className='min-w-0 flex-1'>
                            <p className='flex items-center gap-2 font-semibold text-white'>
                                {bundle.title}
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${bundle.is_published ? 'bg-green-950 text-green-400' : 'bg-slate-800 text-gray-400'}`}>
                                    {bundle.is_published ? 'PUBLISHED' : 'DRAFT'}
                                </span>
                            </p>
                            <p className='text-xs text-gray-500'>/bundles/{bundle.slug} · {bundle.story_count} {bundle.story_count === 1 ? 'story' : 'stories'}</p>
                        </div>
                        <button type='button' onClick={() => startEditing(bundle)} aria-label={`Edit ${bundle.title}`} className='text-gray-400 hover:text-white'>
                            <Pencil className='h-4 w-4' />
                        </button>
                        <button type='button' onClick={() => handleDelete(bundle)} aria-label={`Delete ${bundle.title}`} className='text-gray-500 hover:text-red-400'>
                            <Trash2 className='h-4 w-4' />
                        </button>
                    </li>
                ))}
                {bundles?.length === 0 && <p className='text-sm text-gray-500'>No bundles yet.</p>}
            </ul>
        </div>
    )
}

export default BundlesDashboard
