import { useState, useEffect } from 'react'
import { Tags, Pencil, Trash2 } from 'lucide-react'
import { getAdminList, createAdminItem, updateAdminItem, deleteAdminItem } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { CATEGORY_COLORS } from '../../styles/categoryColors'
import { CATEGORY_ICONS, FALLBACK_ICON } from '../CategoryGrid/categoryIcons'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> CATEGORIES (/dashboard/categories).
//
// Add, edit and delete the story categories (the tiles on the
// homepage). ONE form does both "add" and "edit":
//   editingId = null  -> the form adds a new category
//   editingId = 5     -> the form changes category 5
//
// Deleting a category does NOT delete its stories - they just
// have no category any more.
// ---------------------------------------------------------------

const EMPTY_FORM = { name: '', slug: '', description: '', icon: 'ghost', color: 'red' }

// "Haunted Places" -> "haunted-places" (the URL part).
// .normalize + the first replace remove accents: "Café" -> "Cafe".
function makeSlug(text) {
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')   // anything else becomes a dash
        .replace(/^-|-$/g, '')         // no dash at the start or end
}


function CategoriesDashboard() {
    const [categories, setCategories] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [editingId, setEditingId] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getAdminList('categories')
            .then(data => setCategories(data))
            .catch(() => setError('Could not load the categories.'))
    }, [reloadKey])

    function updateForm(name, value) {
        setForm(current => {
            const next = { ...current, [name]: value }
            // Typing the name fills in the slug too - but only while
            // ADDING. Changing an existing slug would break old links.
            if (name === 'name' && editingId === null) {
                next.slug = makeSlug(value)
            }
            return next
        })
    }

    // Load a category into the form to edit it.
    function startEditing(category) {
        setEditingId(category.id)
        setForm({
            name: category.name,
            slug: category.slug,
            description: category.description,
            icon: category.icon,
            color: category.color,
        })
        // Scroll up to the form.
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
            if (editingId === null) {
                await createAdminItem('categories', form)
                setNotice(`"${form.name}" added.`)
            } else {
                await updateAdminItem('categories', editingId, form)
                setNotice(`"${form.name}" saved.`)
            }
            cancelEditing()
            reload()
        } catch (err) {
            // e.g. { slug: ['category with this slug already exists.'] }
            setError(err.data ? Object.entries(err.data).map(([field, msgs]) => `${field}: ${[msgs].flat().join(' ')}`).join(' · ') : 'Could not save.')
        }
    }

    async function handleDelete(category) {
        const warning = category.story_count > 0
            ? `Delete "${category.name}"? Its ${category.story_count} stories will have no category.`
            : `Delete "${category.name}"?`
        if (!window.confirm(warning)) return
        await deleteAdminItem('categories', category.id)
        setNotice(`"${category.name}" deleted.`)
        reload()
    }

    // The preview of the icon the form has picked.
    const PreviewIcon = CATEGORY_ICONS[form.icon] ?? FALLBACK_ICON

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Tags className='h-7 w-7 text-red-500' />
                Categories
            </h1>
            <p className='mt-1 text-gray-400'>The story categories on the homepage and in the menu.</p>

            <PageMessages error={error} notice={notice} />

            {/* ---------- ADD / EDIT FORM ---------- */}
            <form onSubmit={handleSubmit} className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <h2 className='font-semibold text-white'>{editingId === null ? 'Add a category' : `Edit "${form.name}"`}</h2>

                <div className='grid gap-4 sm:grid-cols-2'>
                    <div>
                        <label htmlFor='name' className={LABEL_STYLE}>Name</label>
                        <input id='name' value={form.name} onChange={event => updateForm('name', event.target.value)} maxLength={100} className={INPUT_STYLE} />
                    </div>
                    <div>
                        <label htmlFor='slug' className={LABEL_STYLE}>URL name <span className='font-normal text-gray-500'>(/category/…)</span></label>
                        <input id='slug' value={form.slug} onChange={event => updateForm('slug', makeSlug(event.target.value))} className={INPUT_STYLE} />
                    </div>
                </div>

                <div>
                    <label htmlFor='description' className={LABEL_STYLE}>Description</label>
                    <input id='description' value={form.description} onChange={event => updateForm('description', event.target.value)} className={INPUT_STYLE} />
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                    <div>
                        <label htmlFor='icon' className={LABEL_STYLE}>Icon</label>
                        <div className='flex items-center gap-3'>
                            {/* Every icon React knows (categoryIcons.js). */}
                            <select id='icon' value={form.icon} onChange={event => updateForm('icon', event.target.value)} className={`${INPUT_STYLE} [color-scheme:dark]`}>
                                {Object.keys(CATEGORY_ICONS).map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <PreviewIcon className={`h-7 w-7 shrink-0 ${CATEGORY_COLORS[form.color]?.icon ?? 'text-gray-400'}`} />
                        </div>
                    </div>
                    <div>
                        <p className={LABEL_STYLE}>Colour</p>
                        {/* One round button per colour, in that colour. */}
                        <div className='flex flex-wrap gap-2'>
                            {Object.keys(CATEGORY_COLORS).map(color => (
                                <button
                                    key={color}
                                    type='button'
                                    onClick={() => updateForm('color', color)}
                                    aria-label={color}
                                    aria-pressed={form.color === color}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full border ${CATEGORY_COLORS[color].iconBox} ${
                                        form.color === color ? 'ring-2 ring-white' : ''
                                    }`}
                                >
                                    <span className={`h-3 w-3 rounded-full bg-current ${CATEGORY_COLORS[color].icon}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className='flex gap-2'>
                    <button type='submit' disabled={!form.name.trim() || !form.slug} className={BUTTON_STYLE}>
                        {editingId === null ? 'Add category' : 'Save changes'}
                    </button>
                    {editingId !== null && (
                        <button type='button' onClick={cancelEditing} className='rounded-lg border border-slate-600 px-4 text-sm text-gray-300 hover:border-slate-400'>Cancel</button>
                    )}
                </div>
            </form>

            {/* ---------- THE LIST ---------- */}
            <ul className='mt-8 grid gap-3 sm:grid-cols-2'>
                {categories?.map(category => {
                    const Icon = CATEGORY_ICONS[category.icon] ?? FALLBACK_ICON
                    const colors = CATEGORY_COLORS[category.color] ?? CATEGORY_COLORS.red
                    return (
                        <li key={category.id} className='flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4'>
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${colors.iconBox}`}>
                                <Icon className={`h-5 w-5 ${colors.icon}`} />
                            </span>
                            <div className='min-w-0 flex-1'>
                                <p className='truncate font-semibold text-white'>{category.name}</p>
                                <p className='text-xs text-gray-500'>/{category.slug} · {category.story_count} {category.story_count === 1 ? 'story' : 'stories'}</p>
                            </div>
                            <button type='button' onClick={() => startEditing(category)} aria-label={`Edit ${category.name}`} className='text-gray-400 hover:text-white'>
                                <Pencil className='h-4 w-4' />
                            </button>
                            <button type='button' onClick={() => handleDelete(category)} aria-label={`Delete ${category.name}`} className='text-gray-500 hover:text-red-400'>
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default CategoriesDashboard
