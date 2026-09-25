import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'


// ---------------------------------------------------------------
// Turns a list of stories into groups by category:
//
//   [ {title: 'A', category: 'Paranormal'}, {title: 'B', category: 'Paranormal'},
//     {title: 'C', category: 'Cryptids'} ]
//   ->
//   [ { name: 'Paranormal', stories: [A, B] },
//     { name: 'Cryptids',   stories: [C] } ]
//
// Biggest group first. A plain function, no React.
// ---------------------------------------------------------------
function groupByCategory(stories) {
    // An object used as a "lookup table": { Paranormal: [...], Cryptids: [...] }
    const groups = {}

    for (const story of stories) {
        // A story can have no category (it was deleted) - put those
        // together under one name.
        const name = story.category || 'Uncategorised'

        // First story in this category? Start an empty list for it.
        if (!groups[name]) groups[name] = []
        groups[name].push(story)
    }

    // Object.entries({ a: 1 }) = [['a', 1]] - turns the table back
    // into a list we can sort and .map() over.
    return Object.entries(groups)
        .map(([name, list]) => ({ name, stories: list }))
        .sort((a, b) => b.stories.length - a.stories.length)
}


// ---------------------------------------------------------------
// "PUBLICATION MAP" - a closed box that opens to show every story,
// grouped by category, with a bar showing how big each group is.
//
// Usage:
//   <PublicationMap stories={stories} />
//
// `stories` = the same list the story cards use (from /api/stories/).
// ---------------------------------------------------------------
function PublicationMap({ stories }) {
    const [open, setOpen] = useState(false)

    const groups = groupByCategory(stories)

    // The biggest group's size. Every bar is drawn as a % of this,
    // so the biggest bar is always full width.
    const biggest = groups.length > 0 ? groups[0].stories.length : 0

    return (
        <section className='rounded-xl border border-slate-800 bg-slate-900/60'>

            {/* ---------- THE HEADER (always visible) ---------- */}
            {/* The whole row is one button, so it's easy to click.
                aria-expanded tells screen readers if it's open. */}
            <button
                type='button'
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className='flex w-full items-center justify-between px-5 py-4 text-left'
            >
                <div>
                    <h2 className='font-bold text-white'>Publication map</h2>
                    <p className='text-xs text-gray-500'>Every published story, grouped by category.</p>
                </div>

                <span className='flex items-center gap-1 text-sm text-gray-500'>
                    {open ? 'Hide' : 'View'}
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </span>
            </button>

            {/* ---------- THE MAP (only when open) ---------- */}
            {open && (
                <div className='space-y-5 border-t border-slate-800 px-5 py-5'>
                    {groups.length === 0 && (
                        <p className='text-center text-sm text-gray-500'>Nothing published yet.</p>
                    )}

                    {groups.map(group => (
                        <div key={group.name}>
                            <div className='flex items-center justify-between text-sm'>
                                <span className='font-semibold text-white'>{group.name}</span>
                                <span className='text-gray-500'>{group.stories.length}</span>
                            </div>

                            {/* The bar: a grey track with a red fill.
                                style={{ width }} because the size is worked
                                out while the app runs - Tailwind can't
                                make a class for every possible %. */}
                            <div className='mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800'>
                                <div
                                    className='h-full rounded-full bg-red-600'
                                    style={{ width: `${(group.stories.length / biggest) * 100}%` }}
                                />
                            </div>

                            {/* The story titles, as small links. */}
                            <ul className='mt-2 flex flex-wrap gap-x-4 gap-y-1'>
                                {group.stories.map(story => (
                                    <li key={story.id}>
                                        <Link to={`/stories/${story.id}`} className='text-xs text-gray-400 hover:text-red-400'>
                                            {story.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}

export default PublicationMap
