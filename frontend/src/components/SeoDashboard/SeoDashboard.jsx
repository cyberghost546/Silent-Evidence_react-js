import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Globe, ExternalLink } from 'lucide-react'
import { getSeo, updateSeo } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { SettingRow, Toggle } from '../SettingsPage/SettingsParts'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> SEO (/dashboard/seo).
//
// SEO = helping search engines find and show the site well.
//   1. Site title + description: the browser tab name, and the text
//      Google may show under the link. With a Google-style preview.
//   2. Allow indexing: robots.txt says "welcome" or "stay out".
//   3. Links to /sitemap.xml and /robots.txt (made by Django).
//   4. Published stories with problems (short title, no excerpt...).
// ---------------------------------------------------------------

// Google shows about this many characters before cutting off.
const TITLE_LIMIT = 60
const DESCRIPTION_LIMIT = 160


// "42 / 60" under a box - amber when you're over the limit.
function CharCount({ text, limit }) {
    const over = text.length > limit
    return (
        <p className={`mt-1 text-right text-xs ${over ? 'text-amber-300' : 'text-gray-500'}`}>
            {text.length} / {limit}{over && ' - may be cut off'}
        </p>
    )
}


function SeoDashboard() {
    const [data, setData] = useState(null)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    useEffect(() => {
        getSeo()
            .then(result => {
                setData(result)
                setTitle(result.settings.site_title)
                setDescription(result.settings.site_description)
            })
            .catch(() => setError('Could not load the SEO info.'))
    }, [])

    async function save(changes, doneText) {
        setError('')
        setNotice('')
        try {
            const settings = await updateSeo(changes)
            setData({ ...data, settings })
            setNotice(doneText)
        } catch (err) {
            setError(err.data ? Object.values(err.data).flat().join(' ') : 'Could not save.')
        }
    }

    if (!data) return <p className='text-gray-400'>{error || 'Loading SEO info...'}</p>

    const changed = title !== data.settings.site_title || description !== data.settings.site_description

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Globe className='h-7 w-7 text-red-500' />
                SEO Dashboard
            </h1>
            <p className='mt-1 text-gray-400'>How the site shows up in search engines and browser tabs.</p>

            <PageMessages error={error} notice={notice} />

            {/* ---------- 1. TITLE + DESCRIPTION ---------- */}
            <section className='mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <h2 className='text-lg font-bold text-white'>Site title & description</h2>
                <div className='mt-5 grid gap-6 lg:grid-cols-2'>
                    <div className='space-y-4'>
                        <div>
                            <label htmlFor='site-title' className={LABEL_STYLE}>Site title</label>
                            <input id='site-title' value={title} onChange={event => setTitle(event.target.value)} maxLength={70} className={INPUT_STYLE} />
                            <CharCount text={title} limit={TITLE_LIMIT} />
                        </div>
                        <div>
                            <label htmlFor='site-description' className={LABEL_STYLE}>Description</label>
                            <textarea id='site-description' rows={3} value={description} onChange={event => setDescription(event.target.value)} maxLength={160} className={INPUT_STYLE} />
                            <CharCount text={description} limit={DESCRIPTION_LIMIT} />
                        </div>
                        <button
                            type='button'
                            onClick={() => save({ site_title: title.trim(), site_description: description.trim() }, 'Saved. Pages pick it up on the next reload.')}
                            disabled={!changed || !title.trim()}
                            className={BUTTON_STYLE}
                        >
                            Save
                        </button>
                    </div>

                    {/* A pretend search result - roughly how Google shows it. */}
                    <div>
                        <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500'>Search result preview</p>
                        <div className='rounded-xl bg-white p-4 font-sans'>
                            <p className='text-xs text-gray-600'>{window.location.origin}</p>
                            <p className='mt-1 truncate text-lg text-[#1a0dab]'>{title || 'Untitled'}</p>
                            {/* line-clamp-2 = max 2 lines, then "..." like Google. */}
                            <p className='mt-1 line-clamp-2 text-sm text-gray-700'>{description || 'No description.'}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------- 2 + 3. INDEXING, SITEMAP, ROBOTS ---------- */}
            <section className='mt-6 space-y-4'>
                <SettingRow title='Let search engines index the site' text='Off = robots.txt tells every search engine to stay away (useful while the site is still a test).'>
                    <Toggle
                        on={data.settings.allow_indexing}
                        label='Allow indexing'
                        onChange={on => save({ allow_indexing: on }, on ? 'Search engines are welcome.' : 'Search engines are told to stay out.')}
                    />
                </SettingRow>
                <div className='flex flex-wrap gap-3 text-sm'>
                    <a href={data.sitemap_url} target='_blank' rel='noreferrer' className='flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-gray-200 hover:border-slate-500'>
                        sitemap.xml · {data.sitemap_count} pages <ExternalLink className='h-3.5 w-3.5' />
                    </a>
                    <a href={data.robots_url} target='_blank' rel='noreferrer' className='flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-gray-200 hover:border-slate-500'>
                        robots.txt <ExternalLink className='h-3.5 w-3.5' />
                    </a>
                </div>
            </section>

            {/* ---------- 4. STORY PROBLEMS ---------- */}
            <section className='mt-10'>
                <h2 className='text-lg font-bold text-white'>Stories that could do better</h2>
                <p className='mt-1 text-sm text-gray-400'>
                    {data.issues.length} of {data.story_count} published stories have something to fix. Most problems first.
                </p>
                <ul className='mt-4 space-y-2'>
                    {data.issues.map(story => (
                        <li key={story.id} className='rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3'>
                            <p className='text-sm'>
                                <Link to={`/stories/${story.id}`} className='font-semibold text-white hover:text-red-400'>{story.title}</Link>
                                <span className='text-gray-500'> by {story.author}</span>
                            </p>
                            <ul className='mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-200/90'>
                                {story.problems.map(problem => <li key={problem}>• {problem}</li>)}
                            </ul>
                        </li>
                    ))}
                    {data.issues.length === 0 && <li className='text-sm text-green-400'>✓ Every published story looks good.</li>}
                </ul>
            </section>
        </div>
    )
}

export default SeoDashboard
