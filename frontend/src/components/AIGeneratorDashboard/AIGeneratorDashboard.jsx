import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bot, WandSparkles, LoaderCircle, Save, KeyRound } from 'lucide-react'
import { getAIStatus, generateStory, saveGeneratedStory, getCategories } from '../../api/client'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import { MOODS } from '../WriteStory/storyOptions'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> AI GENERATOR (/dashboard/ai). Admins only.
//
//   1. Describe an idea, pick a category, mood, rating and length.
//   2. "Generate" - Django asks Claude (Anthropic's AI) to write it.
//      This takes a while (often 30-60 seconds).
//   3. Read it, fix anything you like in the boxes.
//   4. "Save as draft" - it becomes a DRAFT story by you. Publish it
//      from the Stories page when you're happy. Nothing goes live
//      by itself.
//
// Needs an Anthropic API key on the SERVER (never in React - anyone
// can read React's code in their browser). See dashboard/ai.py.
// ---------------------------------------------------------------

const LENGTHS = [
    { value: 'short', label: 'Short (~600 words)' },
    { value: 'medium', label: 'Medium (~1200)' },
    { value: 'long', label: 'Long (~2000)' },
]

const RATINGS = [
    { value: 'all', label: 'All ages' },
    { value: 'teen', label: '13+' },
    { value: 'mature', label: '18+' },
]

// Starting values for the form - also used by "Start over".
const EMPTY_FORM = {
    idea: '',
    category_id: '',
    mood: '',
    content_rating: 'teen',
    length: 'medium',
}


function AIGeneratorDashboard() {
    // null = still asking Django. Then { configured, model }.
    const [status, setStatus] = useState(null)
    const [categories, setCategories] = useState([])

    const [form, setForm] = useState(EMPTY_FORM)
    const [generating, setGenerating] = useState(false)

    // The story Claude wrote: { title, excerpt, body } - editable.
    const [draft, setDraft] = useState(null)
    const [saving, setSaving] = useState(false)
    // After saving: the new story's id (for the "open it" link).
    const [savedId, setSavedId] = useState(null)

    const [error, setError] = useState('')

    useEffect(() => {
        getAIStatus()
            .then(data => setStatus(data))
            .catch(() => setError('Could not reach Django.'))
        getCategories()
            .then(data => setCategories(data))
            .catch(() => {})
    }, [])

    // One change function for every form field (same trick as the
    // Write a Story page): `name` says which key to change.
    function updateForm(name, value) {
        setForm(current => ({ ...current, [name]: value }))
    }

    function updateDraft(name, value) {
        setDraft(current => ({ ...current, [name]: value }))
    }

    async function handleGenerate(event) {
        event.preventDefault()
        setGenerating(true)
        setError('')
        setSavedId(null)
        try {
            const story = await generateStory(form)
            setDraft(story)
        } catch (err) {
            // Django explains what went wrong (no key, Claude declined...).
            setError(err.data?.detail || 'Something went wrong. Try again.')
        } finally {
            setGenerating(false)
        }
    }

    async function handleSave() {
        setSaving(true)
        setError('')
        try {
            const result = await saveGeneratedStory({
                ...draft,
                category_id: form.category_id,
                mood: form.mood,
                content_rating: form.content_rating,
            })
            setSavedId(result.id)
        } catch (err) {
            setError(err.data?.detail || 'Could not save the story.')
        } finally {
            setSaving(false)
        }
    }

    function startOver() {
        setForm(EMPTY_FORM)
        setDraft(null)
        setSavedId(null)
        setError('')
    }

    if (!status) {
        return <p className='text-gray-400'>{error || 'Loading...'}</p>
    }

    const canGenerate = status.configured && form.idea.trim().length >= 10 && !generating

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Bot className='h-8 w-8 text-red-500' />
                AI Generator
            </h1>
            <p className='mt-1 text-gray-400'>
                Describe a story and Claude writes a first draft. You review it before anything is published.
            </p>

            {/* ---------- NO API KEY YET: how to add one ---------- */}
            {!status.configured && (
                <div className='mt-6 rounded-xl border border-amber-800 bg-amber-950/30 p-5 text-sm text-amber-100'>
                    <p className='flex items-center gap-2 font-semibold text-amber-300'>
                        <KeyRound className='h-4 w-4' />
                        An Anthropic API key is needed
                    </p>
                    <ol className='mt-3 list-decimal space-y-1.5 pl-5'>
                        <li>Create a key at <span className='font-mono'>console.anthropic.com</span> (it costs a little per story).</li>
                        <li>Stop Django, then start it again with the key (PowerShell):</li>
                    </ol>
                    <pre className='mt-2 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-xs text-gray-200'>
{`$env:ANTHROPIC_API_KEY = "sk-ant-..."
python manage.py runserver`}
                    </pre>
                    <p className='mt-2 text-xs text-amber-200/80'>Never put the key in the code or in git.</p>
                </div>
            )}

            <PageMessages error={error} notice='' />

            {/* ---------- THE FORM ---------- */}
            <form onSubmit={handleGenerate} className='mt-6 space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <div>
                    <label htmlFor='idea' className={LABEL_STYLE}>Your idea</label>
                    <textarea
                        id='idea'
                        value={form.idea}
                        onChange={event => updateForm('idea', event.target.value)}
                        rows={4}
                        maxLength={2000}
                        placeholder='e.g. A night-shift nurse notices that the patient in room 13 is always awake - but the room has been empty for years.'
                        className={`${INPUT_STYLE} resize-y`}
                    />
                </div>

                {/* Two dropdowns side by side (one column on phones). */}
                <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                    <div>
                        <label htmlFor='category' className={LABEL_STYLE}>Category</label>
                        <select
                            id='category'
                            value={form.category_id}
                            onChange={event => updateForm('category_id', event.target.value)}
                            className={`${INPUT_STYLE} [color-scheme:dark]`}
                        >
                            <option value=''>Choose...</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor='mood' className={LABEL_STYLE}>Mood</label>
                        <select
                            id='mood'
                            value={form.mood}
                            onChange={event => updateForm('mood', event.target.value)}
                            className={`${INPUT_STYLE} [color-scheme:dark]`}
                        >
                            <option value=''>Any</option>
                            {MOODS.map(mood => (
                                <option key={mood.value} value={mood.value}>{mood.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className='flex flex-wrap gap-8'>
                    <div>
                        <p className={LABEL_STYLE}>Rating</p>
                        <SegmentedControl label='Rating' options={RATINGS} value={form.content_rating} onChange={value => updateForm('content_rating', value)} />
                    </div>
                    <div>
                        <p className={LABEL_STYLE}>Length</p>
                        <SegmentedControl label='Length' options={LENGTHS} value={form.length} onChange={value => updateForm('length', value)} />
                    </div>
                </div>

                <button type='submit' disabled={!canGenerate} className={`${BUTTON_STYLE} flex items-center gap-2`}>
                    {/* animate-spin = Tailwind's spinning animation. */}
                    {generating ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <WandSparkles className='h-4 w-4' />}
                    {generating ? 'Claude is writing... (this can take a minute)' : draft ? 'Generate again' : 'Generate story'}
                </button>
            </form>

            {/* ---------- THE RESULT ---------- */}
            {draft && (
                <section className='mt-8 rounded-2xl border border-red-900/60 bg-slate-900/60 p-6'>
                    <h2 className='text-sm font-semibold uppercase tracking-wider text-red-400'>The draft - edit anything</h2>

                    <label htmlFor='draft-title' className={`${LABEL_STYLE} mt-4`}>Title</label>
                    <input id='draft-title' value={draft.title} onChange={event => updateDraft('title', event.target.value)} className={INPUT_STYLE} />

                    <label htmlFor='draft-excerpt' className={`${LABEL_STYLE} mt-4`}>Excerpt</label>
                    <input id='draft-excerpt' value={draft.excerpt} onChange={event => updateDraft('excerpt', event.target.value)} className={INPUT_STYLE} />

                    <label htmlFor='draft-body' className={`${LABEL_STYLE} mt-4`}>
                        Story <span className='font-normal text-gray-500'>({draft.body.split(/\s+/).filter(Boolean).length} words)</span>
                    </label>
                    <textarea
                        id='draft-body'
                        value={draft.body}
                        onChange={event => updateDraft('body', event.target.value)}
                        rows={16}
                        className={`${INPUT_STYLE} resize-y leading-7`}
                    />

                    {savedId ? (
                        <p className='mt-5 rounded-lg border border-green-800 bg-green-950/40 px-4 py-3 text-sm text-green-300'>
                            Saved as a draft. Publish it from the{' '}
                            <Link to='/dashboard/stories' className='font-semibold underline'>Stories page</Link>
                            {' '}- or <button type='button' onClick={startOver} className='font-semibold underline'>write another one</button>.
                        </p>
                    ) : (
                        <div className='mt-5 flex flex-wrap items-center gap-3'>
                            <button
                                type='button'
                                onClick={handleSave}
                                disabled={saving || !form.category_id}
                                className={`${BUTTON_STYLE} flex items-center gap-2`}
                            >
                                <Save className='h-4 w-4' />
                                {saving ? 'Saving...' : 'Save as draft'}
                            </button>
                            {!form.category_id && <p className='text-sm text-amber-300'>Pick a category above to save it.</p>}
                        </div>
                    )}
                </section>
            )}

            <p className='mt-6 text-xs text-gray-500'>Model: {status.model}. Written by AI - always read it before publishing.</p>
        </div>
    )
}

export default AIGeneratorDashboard
