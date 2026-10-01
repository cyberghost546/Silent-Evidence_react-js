import { useState, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { EyeOff } from 'lucide-react'
import { getMyTrueStories, submitTrueStory, withdrawTrueStory, getCategories } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { usePageTitle } from '../../hooks/usePageTitle'
import { countWords } from '../../utils/storyFormat'
import { formatShortDate } from '../../utils/format'
import PageLayout from '../PageLayout/PageLayout'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE, FIELD_ERROR_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// SHARE A TRUE STORY (/true-stories/submit) - logged in only (App.jsx).
//
// The form, then "Your submissions" with where each one is at.
// An admin reads every story before it goes up, and it's published
// under the name "Anonymous" - never yours (Django: stories/true_story_views.py).
// ---------------------------------------------------------------
// The map, loaded only when this page opens (Leaflet is big).
const PlacePicker = lazy(() => import('../Map/PlacePicker'))

const MIN_WORDS = 50
const EMPTY_FORM = { title: '', where_when: '', category_id: '', body: '', confirm_true: false, latitude: '', longitude: '' }

// The coloured label for each status. Written out in full so
// Tailwind can see the class names.
const STATUS_LABELS = {
    pending: { text: 'Waiting for review', style: 'border-amber-800 bg-amber-950/40 text-amber-300' },
    approved: { text: 'Published', style: 'border-green-800 bg-green-950/40 text-green-400' },
    rejected: { text: 'Not published', style: 'border-slate-600 bg-slate-800 text-gray-300' },
}

function TrueStorySubmitPage() {
    usePageTitle('Share a true story')
    const { data: mine, reload } = useApi(() => getMyTrueStories())
    const { data: categories } = useApi(() => getCategories())
    const [form, setForm] = useState(EMPTY_FORM)
    const [error, setError] = useState('')
    const [sent, setSent] = useState(false)

    const words = countWords(form.body)
    const ready = form.title.trim() && words >= MIN_WORDS && form.confirm_true

    function update(name, value) {
        setForm(current => ({ ...current, [name]: value }))
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')
        try {
            // '' -> null: no place picked. Django blurs a picked place to ~1 km.
            await submitTrueStory({ ...form, category_id: form.category_id || null, latitude: form.latitude || null, longitude: form.longitude || null })
            setForm(EMPTY_FORM)
            setSent(true)
            reload()
        } catch (err) {
            setError(err.data?.detail || 'Could not send your story.')
        }
    }

    async function handleWithdraw(item) {
        if (!window.confirm(`Take back "${item.title}"? It will be deleted.`)) return
        await withdrawTrueStory(item.id)
        reload()
    }

    return (
        <PageLayout title='Share a true story' subtitle='Something happened to you that you still cannot explain? Tell us.' width='narrow'>
            {/* How the anonymity works - people need to trust this before they share. */}
            <div className='mb-6 flex gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-gray-300'>
                <EyeOff className='mt-0.5 h-5 w-5 shrink-0 text-orange-300' />
                <p>
                    Your story is published under the name <strong className='text-white'>Anonymous</strong> - never your username.
                    Only the site&apos;s admins can see who sent it, and an admin reads every story before it goes up.
                    You&apos;ll get a notification either way.
                </p>
            </div>

            {sent && (
                <p className='mb-6 rounded-lg border border-green-800 bg-green-950/40 px-4 py-3 text-sm text-green-300'>
                    Thank you - your story was sent. An admin will read it soon.
                </p>
            )}

            <form onSubmit={handleSubmit} className='space-y-5'>
                <div>
                    <label htmlFor='true-title' className={LABEL_STYLE}>Title</label>
                    <input id='true-title' value={form.title} onChange={event => update('title', event.target.value)} maxLength={200} placeholder='The knocking in the wall' className={INPUT_STYLE} />
                </div>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div>
                        <label htmlFor='true-where' className={LABEL_STYLE}>Where and when? <span className='font-normal text-gray-500'>(optional)</span></label>
                        <input id='true-where' value={form.where_when} onChange={event => update('where_when', event.target.value)} maxLength={200} placeholder='Ohio, summer 2009' className={INPUT_STYLE} />
                    </div>
                    <div>
                        <label htmlFor='true-category' className={LABEL_STYLE}>Category <span className='font-normal text-gray-500'>(optional)</span></label>
                        <select id='true-category' value={form.category_id} onChange={event => update('category_id', event.target.value)} className={`${INPUT_STYLE} [color-scheme:dark]`}>
                            <option value=''>- let the admins pick -</option>
                            {categories?.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <p className={LABEL_STYLE}>Where on the map? <span className='font-normal text-gray-500'>(optional - click the place)</span></p>
                    <p className='mb-2 text-xs text-gray-400'>For your privacy the pin is blurred to about 1 km - it never points at a house.</p>
                    <Suspense fallback={<p className='text-xs text-gray-500'>Loading map...</p>}>
                        <PlacePicker latitude={form.latitude} longitude={form.longitude} onPick={(lat, lng) => setForm(current => ({ ...current, latitude: lat, longitude: lng }))} />
                    </Suspense>
                    {form.latitude && (
                        <button type='button' onClick={() => setForm(current => ({ ...current, latitude: '', longitude: '' }))} className='mt-1 text-xs text-gray-400 hover:text-white'>
                            Remove the pin
                        </button>
                    )}
                </div>
                <div>
                    <label htmlFor='true-body' className={LABEL_STYLE}>What happened?</label>
                    <textarea id='true-body' value={form.body} onChange={event => update('body', event.target.value)} rows={14} className={INPUT_STYLE} />
                    <p className={words >= MIN_WORDS ? 'mt-1 text-xs text-gray-500' : FIELD_ERROR_STYLE}>
                        {words} words{words < MIN_WORDS && ` - at least ${MIN_WORDS}, please`}
                    </p>
                </div>
                <label className='flex cursor-pointer items-start gap-3 text-sm text-gray-300'>
                    <input type='checkbox' checked={form.confirm_true} onChange={event => update('confirm_true', event.target.checked)} className='mt-0.5 h-4 w-4 accent-red-600' />
                    This really happened to me (or to someone I know well), told as truthfully as I can.
                </label>
                {error && <p className='text-sm text-red-400'>{error}</p>}
                <button type='submit' disabled={!ready} className={BUTTON_STYLE}>Send for review</button>
            </form>

            {/* ---------- YOUR SUBMISSIONS ---------- */}
            {mine?.length > 0 && (
                <section className='mt-12'>
                    <h2 className='text-lg font-bold text-white'>Your submissions</h2>
                    <p className='text-xs text-gray-500'>Only you can see this list.</p>
                    <ul className='mt-3 divide-y divide-slate-800 rounded-2xl border border-slate-800'>
                        {mine.map(item => (
                            <li key={item.id} className='flex flex-wrap items-center gap-3 px-4 py-3 text-sm'>
                                <div className='min-w-0 flex-1'>
                                    {item.story_id
                                        ? <Link to={`/stories/${item.story_id}`} className='font-semibold text-white hover:text-red-300'>{item.title}</Link>
                                        : <span className='font-semibold text-white'>{item.title}</span>}
                                    <p className='text-xs text-gray-500'>Sent {formatShortDate(item.created_at)}</p>
                                    {item.admin_note && <p className='mt-1 text-xs text-gray-300'>Admin: {item.admin_note}</p>}
                                </div>
                                <span className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_LABELS[item.status].style}`}>
                                    {STATUS_LABELS[item.status].text}
                                </span>
                                {item.status === 'pending' && (
                                    <button type='button' onClick={() => handleWithdraw(item)} className='text-xs text-gray-400 hover:text-red-400'>Take back</button>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </PageLayout>
    )
}

export default TrueStorySubmitPage
