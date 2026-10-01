import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Star, Heart, MessageSquare, Eye, Trash2 } from 'lucide-react'
import { getAdminStories, updateAdminStory, deleteAdminStory } from '../../api/client'
import { AdminSearch, AdminFilters, PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> STORIES (/dashboard/stories). Admins only.
//
// Every story on the site - drafts and archived ones too:
//   - change its status: Draft / Published / Archived
//   - ★ = make it the Story of the Day (shown on the homepage)
//   - delete one, or tick several and delete them together
//
// ARCHIVED = off the site, but not deleted. Put it back to
// Published any time.
//
// It's built exactly like the Users page (UsersDashboard.jsx) -
// compare the two to see the pattern:
//   load everything -> search + filter + sort in the browser -> table
// ---------------------------------------------------------------


const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'DRAFT' },
    { value: 'published', label: 'PUBLISHED' },
    { value: 'archived', label: 'ARCHIVED' },
]

// The colour of each status in the dropdown.
const STATUS_STYLES = {
    published: 'border-red-700 text-red-400',
    draft: 'border-slate-600 text-gray-300',
    archived: 'border-amber-800 text-amber-400',
}

// "2026-09-24T10:00:00Z" -> "9/24/2026" (the date in your own format).
function shortDate(isoString) {
    return new Date(isoString).toLocaleDateString()
}


// ---------------------------------------------------------------
// One row.
//
// Props:
//   story     - one story from Django
//   selected  - is its checkbox ticked?
//   onSelect  - tick / untick
//   onChange  - (id, { status: 'draft' }) -> save a change
//   onDelete  - (story) -> delete it
// ---------------------------------------------------------------
function StoryRow({ story, selected, onSelect, onChange, onDelete }) {
    return (
        <tr className='border-t border-slate-800 transition-colors hover:bg-slate-800/30'>
            <td className='px-4 py-3.5'>
                <input
                    type='checkbox'
                    checked={selected}
                    onChange={onSelect}
                    aria-label={`Select ${story.title}`}
                    className='h-4 w-4 accent-red-600'
                />
            </td>

            {/* Title: a link to the story when the public can open it. */}
            <td className='max-w-[16rem] px-2.5 py-3.5'>
                {story.status === 'published' ? (
                    <Link to={`/stories/${story.id}`} className='block truncate font-semibold text-white hover:text-red-400'>
                        {story.title}
                    </Link>
                ) : (
                    <span className='block truncate font-semibold text-white'>{story.title}</span>
                )}
            </td>

            <td className='px-2.5 py-3.5 text-sm text-gray-400'>
                <Link to={`/profile/${story.author}`} className='hover:text-white'>{story.author}</Link>
            </td>

            {/* ?? = "if it's null, show this instead". */}
            <td className='px-2.5 py-3.5 text-sm text-gray-400'>{story.category ?? '—'}</td>

            {/* ---------- STATUS DROPDOWN ---------- */}
            <td className='px-2.5 py-3.5'>
                <select
                    value={story.status}
                    onChange={event => onChange(story.id, { status: event.target.value })}
                    aria-label={`Status of ${story.title}`}
                    className={`rounded-full border bg-slate-900 px-3 py-1 text-xs font-bold uppercase [color-scheme:dark] focus:outline-none ${STATUS_STYLES[story.status]}`}
                >
                    <option value='draft'>Draft</option>
                    <option value='published'>Published</option>
                    <option value='archived'>Archived</option>
                </select>
            </td>

            {/* ---------- ★ STORY OF THE DAY ---------- */}
            <td className='px-2.5 py-3.5 text-center'>
                {/* fill-current = the star is filled in with its colour
                    (normally lucide icons are only an outline). */}
                <button
                    type='button'
                    onClick={() => onChange(story.id, { is_story_of_the_day: !story.is_story_of_the_day })}
                    aria-pressed={story.is_story_of_the_day}
                    aria-label={story.is_story_of_the_day ? 'Remove as Story of the Day' : 'Make Story of the Day'}
                    title={story.is_story_of_the_day ? 'Story of the Day - click to remove' : 'Make Story of the Day'}
                    className='rounded p-1 transition-colors hover:bg-slate-800'
                >
                    <Star
                        className={`h-4 w-4 ${
                            story.is_story_of_the_day ? 'fill-current text-yellow-400' : 'fill-current text-slate-600 hover:text-slate-400'
                        }`}
                    />
                </button>
            </td>

            <td className='px-2.5 py-3.5 text-center text-sm text-gray-300'>{story.like_count}</td>
            <td className='px-2.5 py-3.5 text-center text-sm text-gray-300'>{story.comment_count}</td>
            <td className='px-2.5 py-3.5 text-center text-sm text-gray-300'>{story.views}</td>
            <td className='whitespace-nowrap px-2.5 py-3.5 text-sm text-gray-500'>{shortDate(story.created_at)}</td>

            <td className='px-4 py-3.5 text-right'>
                <button
                    type='button'
                    onClick={() => onDelete(story)}
                    className='rounded-md border border-red-800 px-3 py-1 text-xs text-red-400 transition-colors hover:bg-red-950/60'
                >
                    Delete
                </button>
            </td>
        </tr>
    )
}


function StoriesDashboard() {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [selected, setSelected] = useState(new Set())

    // Same reload trick as the Users page.
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getAdminStories()
            .then(result => setData(result))
            .catch(() => setError('Could not load the stories.'))
    }, [reloadKey])


    // ---------- SEARCH + FILTER (in the browser) ----------
    let shownStories = []
    if (data) {
        const words = search.trim().toLowerCase()

        shownStories = data.stories
            .filter(story => filter === 'all' || story.status === filter)
            // Title, author or category. (story.category ?? '') because
            // a story without a category has null there, and
            // null.toLowerCase() would crash.
            .filter(story =>
                words === '' ||
                story.title.toLowerCase().includes(words) ||
                story.author.toLowerCase().includes(words) ||
                (story.category ?? '').toLowerCase().includes(words)
            )
    }


    // ---------- CHANGES ----------
    async function handleChange(id, changes) {
        setError('')
        setNotice('')
        try {
            await updateAdminStory(id, changes)
            reload()
        } catch (err) {
            setError(err.data?.detail || 'Could not save that change.')
        }
    }

    async function handleDelete(story) {
        if (!window.confirm(`Delete "${story.title}" for good? Its likes and comments go too.`)) return
        try {
            await deleteAdminStory(story.id)
            setNotice(`"${story.title}" was deleted.`)
            reload()
        } catch {
            setError('Could not delete that story.')
        }
    }

    function toggleSelected(id) {
        const next = new Set(selected)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelected(next)
    }

    const shownIds = shownStories.map(story => story.id)
    const allSelected = shownIds.length > 0 && shownIds.every(id => selected.has(id))

    function toggleAll() {
        setSelected(allSelected ? new Set() : new Set(shownIds))
    }

    async function deleteSelected() {
        const count = selected.size
        if (!window.confirm(`Delete ${count} ${count === 1 ? 'story' : 'stories'} for good?`)) return
        try {
            await Promise.all([...selected].map(id => deleteAdminStory(id)))
            setNotice(`${count} ${count === 1 ? 'story' : 'stories'} deleted.`)
        } catch {
            setError('Some stories could not be deleted.')
        }
        setSelected(new Set())
        reload()
    }


    // ---------- THE PAGE ----------
    if (!data) {
        return <p className='text-gray-400'>{error || 'Loading stories...'}</p>
    }

    return (
        <div>
            <h1 className='text-3xl font-bold text-white'>Stories</h1>
            <p className='mt-1 text-gray-400'>
                {data.counts.total} total {data.counts.total === 1 ? 'story' : 'stories'}
                {/* A small breakdown after the total. */}
                <span className='text-gray-500'>
                    {' '}· {data.counts.published} published · {data.counts.draft} {data.counts.draft === 1 ? 'draft' : 'drafts'} · {data.counts.archived} archived
                </span>
            </p>

            <div className='mt-8 flex flex-col gap-3 xl:flex-row xl:items-center'>
                <AdminSearch value={search} onChange={setSearch} placeholder='Search by title, author, or category...' />
                <AdminFilters filters={FILTERS} value={filter} onChange={setFilter} />
            </div>

            <PageMessages error={error} notice={notice} />

            <div className='mt-5 flex min-h-9 items-center justify-between'>
                <p className='text-sm text-gray-400'>
                    Showing <span className='font-bold text-white'>{shownStories.length}</span> of {data.counts.total} stories
                </p>
                {selected.size > 0 && (
                    <button
                        type='button'
                        onClick={deleteSelected}
                        className='flex items-center gap-2 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700'
                    >
                        <Trash2 className='h-4 w-4' />
                        Delete {selected.size} selected
                    </button>
                )}
            </div>

            {/* overflow-x-auto: on a phone the table scrolls sideways
                inside this box. `relative` matters too: the hidden
                screen-reader labels (sr-only) are position: absolute, and
                without a `relative` box around them they "escape" the
                scroll box and make the WHOLE page scroll sideways. */}
            <div className='mt-3 relative overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40'>
                <table className='w-full min-w-[52rem] text-left'>
                    <thead>
                        <tr className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                            <th className='px-4 py-4'>
                                <input
                                    type='checkbox'
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    aria-label='Select all shown stories'
                                    className='h-4 w-4 accent-red-600'
                                />
                            </th>
                            <th className='px-2.5 py-4'>Title</th>
                            <th className='px-2.5 py-4'>Author</th>
                            <th className='px-2.5 py-4'>Category</th>
                            <th className='px-2.5 py-4'>Status</th>
                            {/* Icon-only headers: the icon is hidden from
                                screen readers (aria-hidden), and sr-only
                                text says what the column is instead.
                                sr-only = invisible, but read out loud. */}
                            <th className='px-2.5 py-4 text-center'>
                                <Star className='mx-auto h-4 w-4 fill-current' aria-hidden='true' />
                                <span className='sr-only'>Story of the Day</span>
                            </th>
                            <th className='px-2.5 py-4 text-center'>
                                <Heart className='mx-auto h-4 w-4' aria-hidden='true' />
                                <span className='sr-only'>Likes</span>
                            </th>
                            <th className='px-2.5 py-4 text-center'>
                                <MessageSquare className='mx-auto h-4 w-4' aria-hidden='true' />
                                <span className='sr-only'>Comments</span>
                            </th>
                            <th className='px-2.5 py-4 text-center'>
                                <Eye className='mx-auto h-4 w-4' aria-hidden='true' />
                                <span className='sr-only'>Views</span>
                            </th>
                            <th className='px-2.5 py-4'>Date</th>
                            <th className='px-4 py-4 text-right'>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shownStories.map(story => (
                            <StoryRow
                                key={story.id}
                                story={story}
                                selected={selected.has(story.id)}
                                onSelect={() => toggleSelected(story.id)}
                                onChange={handleChange}
                                onDelete={handleDelete}
                            />
                        ))}
                    </tbody>
                </table>

                {shownStories.length === 0 && (
                    <p className='px-5 py-10 text-center text-sm text-gray-500'>No stories match this search.</p>
                )}
            </div>
        </div>
    )
}

export default StoriesDashboard
