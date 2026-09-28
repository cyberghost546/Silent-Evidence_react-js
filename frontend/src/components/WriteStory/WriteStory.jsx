import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, ChevronDown, ImagePlus, Crown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getCategories, createStory, importDocx } from '../../api/client'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import StoryEditor from './StoryEditor'
import PromptBox from './PromptBox'
import TagInput from './TagInput'
import { LANGUAGES, MOODS, CONTENT_RATINGS, CONTENT_WARNINGS, TEMPLATES } from './storyOptions'
import { LABEL_STYLE, INPUT_STYLE, BUTTON_STYLE, FIELD_ERROR_STYLE } from '../../styles/formStyles'
import { countWords } from '../../utils/storyFormat'
import SeriesPicker from './SeriesPicker'

// The map picker, loaded only when the Write page needs it (Leaflet is big).
const PlacePicker = lazy(() => import('../Map/PlacePicker'))


// ---------------------------------------------------------------
// THE WRITE A STORY PAGE (/write) - logged-in users only (App.jsx).
//
// How it works, top to bottom:
//   1. Every input is one key in the `form` state object.
//   2. The form is saved in localStorage as you type, so closing
//      the tab doesn't lose your story ("Draft restored...").
//   3. "Publish Story" packs everything into FormData and sends it
//      to Django (POST /api/stories/new/).
//   4. Django checks it. Problems come back per field and are shown
//      under the right input, like on the Sign Up page.
//
// Not built yet (shown, but switched off): Story Series, the AI
// Writing Assistant and Premium Options. Each needs its own backend
// work first.
// ---------------------------------------------------------------


// What a brand-new, empty form looks like. Used when the page first
// opens, and again after "Discard" or publishing.
//
// The keys are camelCase (JavaScript style). Django uses snake_case
// (cover_image_url), so handleSubmit() translates them.
const EMPTY_FORM = {
    title: '',
    category: '',
    language: 'en',
    coverMode: 'url',       // 'upload' or 'url' - which cover option is picked
    coverUrl: '',
    videoUrl: '',
    excerpt: '',
    body: '',
    location: '',
    latitude: '',
    longitude: '',
    mood: '',
    contentRating: 'all',
    warnings: [],           // e.g. ['Violence', 'Gore']
    tags: [],               // e.g. ['lighthouse', 'vhs'] - see TagInput
    publishAt: '',          // from <input type='datetime-local'>
    audioUrl: '',
    series: '',             // a series id, '' = a single story
}

// The short description is shown on cards - Django allows 300 characters.
const EXCERPT_MAX = 300

// Bigger than this and we say no before even uploading.
const MAX_IMAGE_MB = 5
// Same limit Django checks (StoryCreateSerializer.validate_audio_file).
const MAX_AUDIO_MB = 25

// "Required" red star, written once.
function Required() {
    return <span className='text-red-500'> *</span>
}

// The grey "(optional)" text after a label.
function Hint({ children }) {
    return <span className='font-normal text-gray-500'> {children}</span>
}

// Django's messages for ONE field, or nothing. Same as in SignUp.jsx.
function FieldError({ messages }) {
    if (!messages) return null
    return <p className={FIELD_ERROR_STYLE}>{messages.join(' ')}</p>
}


// ---------------------------------------------------------------
// localStorage helpers. Wrapped in try/catch because localStorage
// can throw (private browsing, storage full) - if it does, the page
// still works, it just doesn't remember the draft.
// ---------------------------------------------------------------
function loadDraft(key) {
    try {
        const saved = localStorage.getItem(key)
        // JSON.parse turns the saved text back into an object.
        return saved ? JSON.parse(saved) : null
    } catch {
        return null
    }
}

function saveDraft(key, form) {
    try {
        localStorage.setItem(key, JSON.stringify(form))
    } catch {
        // Can't save - nothing to do.
    }
}

function deleteDraft(key) {
    try {
        localStorage.removeItem(key)
    } catch {
        // Nothing to do.
    }
}

// Is there anything worth calling a "draft"? Just the default
// language and rating being set doesn't count.
function hasContent(form) {
    return form.title.trim() !== '' || form.body.trim() !== '' || form.excerpt.trim() !== ''
}


function WriteStory() {
    const { user } = useAuth()
    const navigate = useNavigate()

    // One draft per user, so two people sharing a computer don't see
    // each other's stories.
    const draftKey = `writeStoryDraft:${user.username}`

    // Load the saved draft ONCE, on the first render (the function
    // form of useState). { ...EMPTY_FORM, ...draft } = start from the
    // empty form, then copy the saved values over the top - so a
    // draft saved before we added a new field still works.
    //
    // SHARED FROM ANOTHER APP (Android's Share menu -> Silent Evidence,
    // "share_target" in public/manifest.webmanifest): the shared words
    // arrive as /write?title=...&text=...&url=... and go into the story
    // - added at the END of a draft you already had, never replacing it.
    const [shared] = useSearchParams()
    const [form, setForm] = useState(() => {
        const start = { ...EMPTY_FORM, ...loadDraft(draftKey) }
        const sharedText = [shared.get('text'), shared.get('url')].filter(Boolean).join('\n\n').trim()
        if (sharedText) start.body = start.body ? `${start.body}\n\n${sharedText}` : sharedText
        if (shared.get('title') && !start.title) start.title = shared.get('title').slice(0, 200)
        return start
    })

    // Show the yellow "Draft restored" bar? Only if the draft had
    // something in it.
    const [draftRestored, setDraftRestored] = useState(() => {
        const draft = loadDraft(draftKey)
        return draft !== null && hasContent({ ...EMPTY_FORM, ...draft })
    })

    // The cover image FILE lives outside `form`, because a file can't
    // be saved in localStorage.
    const [coverFile, setCoverFile] = useState(null)
    // Your own narration (a sound file), if you picked one.
    const [audioFile, setAudioFile] = useState(null)

    // A picked file gets a temporary "blob:" URL so <img> can show it
    // before it's uploaded. useMemo = only make a new URL when the
    // FILE changes, not on every keystroke in the form.
    const coverPreview = useMemo(
        () => (coverFile ? URL.createObjectURL(coverFile) : ''),
        [coverFile]
    )

    const [categories, setCategories] = useState([])
    const [showTemplates, setShowTemplates] = useState(false)
    const [showAssistant, setShowAssistant] = useState(false)

    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')


    // Fetch the categories for the dropdown, once.
    useEffect(() => {
        getCategories()
            .then(setCategories)
            .catch(() => setErrors({ detail: 'Could not load the categories. Is the Django server running?' }))
    }, [])

    // Save the draft every time the form changes. Nothing written
    // yet? Remove the old draft instead of saving an empty one.
    useEffect(() => {
        if (hasContent(form)) {
            saveDraft(draftKey, form)
        } else {
            deleteDraft(draftKey)
        }
    }, [form, draftKey])

    // The cleanup frees the preview's memory (see coverPreview above)
    // when a different file is picked or the page closes.
    useEffect(() => {
        return () => {
            if (coverPreview) URL.revokeObjectURL(coverPreview)
        }
    }, [coverPreview])


    // -----------------------------------------------------------
    // CHANGING THE FORM
    // -----------------------------------------------------------

    // For every normal input: the input's `name` says which key to
    // change. [event.target.name] = "use the value of name as the key".
    function handleChange(event) {
        setForm({ ...form, [event.target.name]: event.target.value })
    }

    // For the pieces that aren't a normal input (editor, toggles):
    // updateField('body', 'new text')
    function updateField(name, value) {
        setForm(current => ({ ...current, [name]: value }))
    }

    // "Import from Word": Django turns the .docx into our marks
    // (stories/docx_import.py). Already wrote something? Ask first.
    const [importing, setImporting] = useState(false)
    async function handleImport(event) {
        const file = event.target.files[0]
        event.target.value = ''   // so picking the same file again still works
        if (!file) return
        if (form.body.trim() && !window.confirm('Replace the text you have now with the Word document?')) return
        setImporting(true)
        try {
            const imported = await importDocx(file)
            setForm(current => ({ ...current, body: imported.body, title: current.title || imported.title }))
            setErrors(current => ({ ...current, body: undefined }))
        } catch (err) {
            setErrors(current => ({ ...current, body: [err.data?.detail || 'Could not import that file.'] }))
        } finally {
            setImporting(false)
        }
    }

    // Ticking a warning chip on or off.
    function toggleWarning(warning) {
        const isOn = form.warnings.includes(warning)

        // On -> make a new list WITHOUT it. Off -> a new list WITH it.
        // (Never .push() into state - React wouldn't notice.)
        const newList = isOn
            ? form.warnings.filter(w => w !== warning)
            : [...form.warnings, warning]

        updateField('warnings', newList)
    }

    function handleAudioChange(event) {
        const file = event.target.files[0]
        if (!file) return
        if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
            setErrors({ ...errors, audio_file: [`The recording must be smaller than ${MAX_AUDIO_MB} MB.`] })
            event.target.value = ''   // empty the picker again
            return
        }
        setErrors({ ...errors, audio_file: undefined })
        setAudioFile(file)
    }

    function handleFileChange(event) {
        // A file input gives a LIST of files; we only allow one.
        const file = event.target.files[0]
        if (!file) return

        // file.size is in bytes. 1 MB = 1024 * 1024 bytes.
        if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
            setErrors({ ...errors, cover_image: [`The image must be smaller than ${MAX_IMAGE_MB} MB.`] })
            return
        }

        setErrors({ ...errors, cover_image: undefined })
        setCoverFile(file)
    }

    function applyTemplate(template) {
        // Don't wipe out someone's story without asking.
        if (form.body.trim() !== '' && !window.confirm('Replace what you wrote with this template?')) {
            return
        }
        updateField('body', template.body)
        setShowTemplates(false)
    }

    function discardDraft() {
        deleteDraft(draftKey)
        setForm(EMPTY_FORM)
        setCoverFile(null)
        setDraftRestored(false)
        setErrors({})
    }


    // -----------------------------------------------------------
    // SENDING IT TO DJANGO
    // -----------------------------------------------------------
    async function handleSubmit(event) {
        event.preventDefault()
        setSuccessMessage('')

        // Quick checks in the browser first, so the user doesn't wait
        // for the server just to hear "title is required". Django
        // checks again anyway - never trust the browser alone.
        const newErrors = {}
        if (form.title.trim() === '') newErrors.title = ['Give your story a title.']
        if (form.category === '') newErrors.category = ['Pick a category.']
        if (form.body.trim() === '') newErrors.body = ['Your story is empty.']

        // Object.keys(...) = the list of keys. Empty = no errors.
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        // FormData, not JSON, because it can carry the image file.
        // The names on the LEFT are Django's field names.
        const data = new FormData()
        data.append('title', form.title.trim())
        data.append('body', form.body)
        data.append('category', form.category)
        data.append('language', form.language)
        data.append('content_rating', form.contentRating)
        data.append('is_published', 'true')
        if (form.series) data.append('series', form.series)

        // Optional fields: only send them if they were filled in.
        // Django would refuse an EMPTY latitude ("not a number"), and
        // leaving it out means "none".
        function addIfFilled(name, value) {
            if (value.trim() !== '') data.append(name, value.trim())
        }
        addIfFilled('excerpt', form.excerpt)
        addIfFilled('video_url', form.videoUrl)
        addIfFilled('audio_url', form.audioUrl)
        if (audioFile) data.append('audio_file', audioFile)
        addIfFilled('location', form.location)
        addIfFilled('latitude', form.latitude)
        addIfFilled('longitude', form.longitude)
        addIfFilled('mood', form.mood)

        // Only the cover option that's currently picked gets sent.
        if (form.coverMode === 'upload' && coverFile) {
            data.append('cover_image', coverFile)
        }
        if (form.coverMode === 'url') {
            addIfFilled('cover_image_url', form.coverUrl)
        }

        // ['Violence', 'Gore'] -> 'Violence,Gore'
        if (form.warnings.length > 0) {
            data.append('content_warnings', form.warnings.join(','))
        }

        // Tags go as the SAME field name several times - that's how
        // FormData sends a list. Django reads them all into tag_names.
        form.tags.forEach(tag => data.append('tag_names', tag))

        // The date input gives local time with no timezone
        // ("2026-10-01T20:00"). toISOString() turns it into UTC, so
        // Django knows exactly which moment was meant.
        let isScheduled = false
        if (form.publishAt !== '') {
            const when = new Date(form.publishAt)
            data.append('publish_at', when.toISOString())
            isScheduled = when > new Date()
        }

        setSaving(true)
        setErrors({})

        try {
            const story = await createStory(data)

            // It's on the server now - the local draft isn't needed.
            deleteDraft(draftKey)
            setForm(EMPTY_FORM)
            setCoverFile(null)
            setDraftRestored(false)

            if (isScheduled) {
                // A scheduled story isn't visible yet, so opening it
                // would say "not found". Tell them instead.
                setSuccessMessage(`Your story is scheduled for ${new Date(form.publishAt).toLocaleString()}.`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                navigate(`/stories/${story.id}`)
            }
        } catch (error) {
            // error.data is Django's answer, e.g. { title: [...] }.
            // (See authRequest in api/client.js.)
            setErrors(error.data || { detail: 'Something went wrong. Please try again.' })
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally {
            // finally runs after try OR catch - the button always comes back.
            setSaving(false)
        }
    }


    // Errors that don't belong to one input (e.g. "You must be logged
    // in") come back as `detail` or `non_field_errors`.
    const generalError = errors.detail || errors.non_field_errors?.join(' ')

    return (
        // PAGE BACKGROUND
        // The outer div is full width and paints a dark navy background
        // behind the whole page. Without it you would see the grey
        // from .home in App.css (used by SiteLayout).
        //   bg-[#020617] = a custom colour, the same dark navy as the
        //                  scrollbar track in index.css. The square
        //                  brackets let you type any hex colour.
        //   min-h-screen = at least as tall as the window, so short
        //                  pages don't show grey under it.
        // Want this background on another page? Copy this outer div
        // and put that page's content inside it.
        <div className='min-h-screen bg-[#020617]'>

        {/* The inner div keeps the form narrow and centred. */}
        <div className='mx-auto max-w-2xl px-4 py-10'>

            {/* ---------- PAGE TITLE ---------- */}
            <h1 className='text-4xl font-bold text-white'>Write a Story</h1>
            {/* gray-300 (not 400) so the text is easy to read. */}
            <p className='mt-1 text-sm text-gray-300'>Share your experience with the Silent Evidence community.</p>

            {/* The thin red line, then two small links. */}
            <div className='mt-4 border-t border-red-900' />
            <div className='mt-3 flex gap-6 text-xs text-gray-400'>
                <Link to='/sprints' className='hover:text-white'>Writing Sprints</Link>
                <Link to='/invites' className='hover:text-white'>Co-author Requests</Link>
            </div>

            {/* ---------- MESSAGES ---------- */}
            {successMessage && (
                <div className='mt-6 rounded-lg border border-green-800 bg-green-950/40 px-4 py-3 text-sm text-green-300'>
                    {successMessage}
                </div>
            )}

            {generalError && (
                <div className='mt-6 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300'>
                    {generalError}
                </div>
            )}

            {/* ---------- TEMPLATE BOX ---------- */}
            <div className='mt-8 rounded-lg border border-dashed border-gray-600'>
                <div className='flex items-center justify-between px-4 py-3'>
                    <p className='text-sm text-gray-400'>Need inspiration? Start with a template.</p>
                    <button
                        type='button'
                        onClick={() => setShowTemplates(!showTemplates)}
                        className='text-sm font-semibold text-red-500 hover:text-red-400'
                    >
                        {showTemplates ? 'Close' : 'Use a Template →'}
                    </button>
                </div>

                {/* The list of templates, only when opened. */}
                {showTemplates && (
                    <div className='grid grid-cols-1 gap-2 border-t border-dashed border-gray-700 p-3 sm:grid-cols-3'>
                        {TEMPLATES.map(template => (
                            <button
                                key={template.name}
                                type='button'
                                onClick={() => applyTemplate(template)}
                                className='rounded-lg border border-slate-700 bg-slate-800 p-3 text-left transition-colors hover:border-red-600'
                            >
                                <p className='text-sm font-semibold text-white'>{template.name}</p>
                                <p className='mt-1 text-xs text-gray-400'>{template.description}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ---------- WRITING PROMPT ---------- */}
            {/* "Use it" puts the prompt in bold at the TOP of the story
                (anything you already wrote stays below it). */}
            <PromptBox onUse={text => updateField('body', `**Prompt:** ${text}\n\n${form.body}`)} />

            {/* ---------- DRAFT RESTORED BAR ---------- */}
            {draftRestored && (
                <div className='mt-5 flex items-center justify-between rounded-lg border border-amber-700/60 bg-amber-950/30 px-4 py-3'>
                    <p className='text-sm text-amber-300'>Draft restored from your last session.</p>
                    <button type='button' onClick={discardDraft} className='text-xs text-amber-400 underline hover:text-amber-300'>
                        Discard
                    </button>
                </div>
            )}

            {/* noValidate: we show our own error messages instead of
                the browser's little pop-ups. */}
            <form onSubmit={handleSubmit} noValidate className='mt-6 space-y-6'>

                {/* ---------- TITLE ---------- */}
                <div>
                    {/* htmlFor = the id of the input. Clicking the label
                        then puts the cursor in the input. */}
                    <label htmlFor='title' className={LABEL_STYLE}>Title<Required /></label>
                    <input
                        id='title'
                        name='title'
                        value={form.title}
                        onChange={handleChange}
                        maxLength={200}
                        placeholder='Give your story a chilling title...'
                        className={INPUT_STYLE}
                    />
                    <FieldError messages={errors.title} />
                </div>

                {/* ---------- CATEGORY ---------- */}
                <div>
                    <label htmlFor='category' className={LABEL_STYLE}>Category<Required /></label>
                    <select id='category' name='category' value={form.category} onChange={handleChange} className={INPUT_STYLE}>
                        <option value=''>Select a category...</option>
                        {/* The value is the category's ID - that's what
                            Django needs to link the story to it. */}
                        {categories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                    <FieldError messages={errors.category} />
                </div>

                {/* ---------- LANGUAGE ---------- */}
                <div>
                    <label htmlFor='language' className={LABEL_STYLE}>
                        Story Language<Hint>(what language is your story written in?)</Hint>
                    </label>
                    <select id='language' name='language' value={form.language} onChange={handleChange} className={INPUT_STYLE}>
                        {LANGUAGES.map(language => (
                            <option key={language.value} value={language.value}>{language.label}</option>
                        ))}
                    </select>
                </div>

                {/* ---------- COVER IMAGE ---------- */}
                <div>
                    <p className={LABEL_STYLE}>Cover Image<Hint>(optional)</Hint></p>

                    {/* Our reusable toggle. It doesn't keep its own state -
                        it shows form.coverMode and tells us when to change it. */}
                    <SegmentedControl
                        label='Cover image source'
                        value={form.coverMode}
                        onChange={mode => updateField('coverMode', mode)}
                        options={[
                            { value: 'upload', label: 'Upload from device' },
                            { value: 'url', label: 'Paste URL' },
                        ]}
                    />

                    <div className='mt-3'>
                        {form.coverMode === 'upload' ? (
                            // The real file input is hidden (sr-only) because
                            // it can't be styled. The <label> around it is the
                            // box you see - clicking a label clicks its input.
                            <label className='flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 bg-slate-800 px-4 py-6 text-sm text-gray-400 transition-colors hover:border-red-600 hover:text-white'>
                                <ImagePlus className='h-5 w-5' />
                                {coverFile ? coverFile.name : 'Choose an image (JPG or PNG)'}
                                <input type='file' accept='image/*' onChange={handleFileChange} className='sr-only' />
                            </label>
                        ) : (
                            <input
                                name='coverUrl'
                                type='url'
                                value={form.coverUrl}
                                onChange={handleChange}
                                placeholder='https://example.com/image.jpg'
                                aria-label='Cover image URL'
                                className={INPUT_STYLE}
                            />
                        )}
                        <FieldError messages={errors.cover_image || errors.cover_image_url} />

                        {/* Small preview of whichever cover is picked. */}
                        {form.coverMode === 'upload' && coverPreview && (
                            <img src={coverPreview} alt='Cover preview' className='mt-3 h-40 w-full rounded-lg object-cover' />
                        )}
                        {form.coverMode === 'url' && form.coverUrl.startsWith('http') && (
                            <img src={form.coverUrl} alt='Cover preview' className='mt-3 h-40 w-full rounded-lg object-cover' />
                        )}
                    </div>
                </div>

                {/* ---------- VIDEO URL ---------- */}
                <div>
                    <label htmlFor='videoUrl' className={LABEL_STYLE}>
                        Video URL<Hint>(optional — YouTube link or direct .mp4)</Hint>
                    </label>
                    <input
                        id='videoUrl'
                        name='videoUrl'
                        type='url'
                        value={form.videoUrl}
                        onChange={handleChange}
                        placeholder='https://www.youtube.com/watch?v=...'
                        className={INPUT_STYLE}
                    />
                    <FieldError messages={errors.video_url} />
                </div>

                {/* ---------- SHORT DESCRIPTION ---------- */}
                <div>
                    <label htmlFor='excerpt' className={LABEL_STYLE}>Short Description<Hint>(optional)</Hint></label>
                    <textarea
                        id='excerpt'
                        name='excerpt'
                        rows={2}
                        value={form.excerpt}
                        onChange={handleChange}
                        maxLength={EXCERPT_MAX}
                        placeholder='A one or two sentence teaser shown on story cards...'
                        className={`${INPUT_STYLE} resize-none`}
                    />
                    {/* A little counter: 42 / 300 */}
                    <p className='mt-1 text-right text-xs text-gray-500'>{form.excerpt.length} / {EXCERPT_MAX}</p>
                    <FieldError messages={errors.excerpt} />
                </div>

                {/* ---------- THE STORY ---------- */}
                <div>
                    <div className='mb-2 flex items-center justify-between'>
                        <label htmlFor='body' className='text-sm font-semibold text-gray-200'>Your Story<Required /></label>
                        <div className='flex items-center gap-4'>
                            {/* A <label> around a hidden file input = a button
                                that opens the file picker. */}
                            <label className='cursor-pointer text-xs font-semibold text-red-400 hover:text-red-300'>
                                {importing ? 'Importing...' : 'Import from Word'}
                                <input type='file' accept='.docx' onChange={handleImport} disabled={importing} className='sr-only' />
                            </label>
                            <span className='text-xs text-gray-500'>{countWords(form.body)} words</span>
                        </div>
                    </div>

                    <StoryEditor id='body' value={form.body} onChange={text => updateField('body', text)} />
                    <FieldError messages={errors.body} />

                    {/* AI Writing Assistant - the button works, the
                        assistant itself isn't built yet. */}
                    <button
                        type='button'
                        onClick={() => setShowAssistant(!showAssistant)}
                        className='mt-3 flex items-center gap-2 rounded-lg border border-purple-700 bg-purple-950/60 px-4 py-2 text-sm font-semibold text-purple-200 transition-colors hover:bg-purple-900/60'
                    >
                        <Sparkles className='h-4 w-4' />
                        AI Writing Assistant
                        <ChevronDown className={`h-4 w-4 transition-transform ${showAssistant ? 'rotate-180' : ''}`} />
                    </button>
                    {showAssistant && (
                        <p className='mt-2 rounded-lg border border-purple-900 bg-purple-950/30 px-4 py-3 text-sm text-purple-300'>
                            Coming soon: get help with titles, descriptions and fixing your grammar.
                        </p>
                    )}
                </div>

                {/* ---------- STORY SERIES (optional) ---------- */}
                {/* Its own component (SeriesPicker.jsx) - it loads your
                    series and can make a new one. */}
                <div>
                    <SeriesPicker value={form.series} onChange={id => updateField('series', id)} />
                    <FieldError messages={errors.series} />
                </div>

                {/* ---------- LOCATION ---------- */}
                <div>
                    <label htmlFor='location' className={LABEL_STYLE}>
                        Location<Hint>(optional — where did it happen?)</Hint>
                    </label>
                    <input
                        id='location'
                        name='location'
                        value={form.location}
                        onChange={handleChange}
                        placeholder='e.g. Amityville, New York'
                        className={INPUT_STYLE}
                    />

                    {/* Two inputs side by side. On a phone (below sm:)
                        they stack instead. */}
                    <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        <div>
                            <input
                                name='latitude'
                                type='number'
                                step='any'
                                value={form.latitude}
                                onChange={handleChange}
                                placeholder='Latitude (e.g. 40.7128)'
                                aria-label='Latitude'
                                className={INPUT_STYLE}
                            />
                            <FieldError messages={errors.latitude} />
                        </div>
                        <div>
                            <input
                                name='longitude'
                                type='number'
                                step='any'
                                value={form.longitude}
                                onChange={handleChange}
                                placeholder='Longitude (e.g. -74.0060)'
                                aria-label='Longitude'
                                className={INPUT_STYLE}
                            />
                            <FieldError messages={errors.longitude} />
                        </div>
                    </div>
                    {/* target='_blank' opens a new tab. rel='noreferrer'
                        stops that site from controlling our tab. */}
                    <p className='mt-1 text-xs text-gray-500'>
                        Or click the map - the story then shows up on the <Link to='/map' className='text-gray-300 hover:text-white'>Haunted Map</Link>.
                    </p>
                    {/* lazy: the map library only downloads when this shows. */}
                    <Suspense fallback={<p className='mt-2 text-xs text-gray-500'>Loading map...</p>}>
                        <div className='mt-2'>
                            <PlacePicker
                                latitude={form.latitude}
                                longitude={form.longitude}
                                onPick={(lat, lng) => setForm(current => ({ ...current, latitude: lat, longitude: lng }))}
                            />
                        </div>
                    </Suspense>
                </div>

                {/* ---------- MOOD ---------- */}
                <div>
                    <label htmlFor='mood' className={LABEL_STYLE}>Story Mood<Hint>(optional)</Hint></label>
                    <select id='mood' name='mood' value={form.mood} onChange={handleChange} className={INPUT_STYLE}>
                        <option value=''>— No mood selected —</option>
                        {MOODS.map(mood => (
                            <option key={mood.value} value={mood.value}>{mood.label}</option>
                        ))}
                    </select>
                </div>

                {/* ---------- CONTENT RATING ---------- */}
                <div>
                    <p className={LABEL_STYLE}>Content Rating<Hint>(who can read this?)</Hint></p>
                    <div className='grid grid-cols-3 gap-3'>
                        {CONTENT_RATINGS.map(rating => {
                            const Icon = rating.icon
                            const isSelected = form.contentRating === rating.value

                            return (
                                <button
                                    key={rating.value}
                                    type='button'
                                    onClick={() => updateField('contentRating', rating.value)}
                                    aria-pressed={isSelected}
                                    className={`rounded-lg border px-2 py-3 text-center transition-colors ${
                                        isSelected
                                            ? 'border-red-500 bg-red-600 text-white'
                                            : 'border-slate-700 bg-slate-800 text-gray-300 hover:border-slate-500'
                                    }`}
                                >
                                    <Icon className='mx-auto h-4 w-4' />
                                    <p className='mt-1 text-sm font-semibold'>{rating.label}</p>
                                    <p className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500'}`}>{rating.hint}</p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* ---------- TAGS ---------- */}
                <div>
                    <p className={LABEL_STYLE}>Tags<Hint>(up to 5 - they help readers find your story)</Hint></p>
                    <TagInput tags={form.tags} onChange={newTags => updateField('tags', newTags)} />
                </div>

                {/* ---------- CONTENT WARNINGS ---------- */}
                <div>
                    <p className={LABEL_STYLE}>Content Warnings<Hint>(select all that apply)</Hint></p>
                    <div className='flex flex-wrap gap-2'>
                        {CONTENT_WARNINGS.map(warning => {
                            const isOn = form.warnings.includes(warning)
                            return (
                                <button
                                    key={warning}
                                    type='button'
                                    onClick={() => toggleWarning(warning)}
                                    aria-pressed={isOn}
                                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                                        isOn
                                            ? 'border-red-500 bg-red-600/20 text-red-300'
                                            : 'border-slate-600 text-gray-300 hover:border-slate-400'
                                    }`}
                                >
                                    {warning}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* ---------- SCHEDULE ---------- */}
                <div>
                    <label htmlFor='publishAt' className={LABEL_STYLE}>
                        Schedule Publishing<Hint>(optional — leave blank to publish now)</Hint>
                    </label>
                    {/* [color-scheme:dark] makes the browser's calendar
                        pop-up dark too, instead of bright white. */}
                    <input
                        id='publishAt'
                        name='publishAt'
                        type='datetime-local'
                        value={form.publishAt}
                        onChange={handleChange}
                        className={`${INPUT_STYLE} [color-scheme:dark]`}
                    />
                    <FieldError messages={errors.publish_at} />
                </div>

                {/* ---------- AUDIO ---------- */}
                <div>
                    <label htmlFor='audioUrl' className={LABEL_STYLE}>
                        Audio Narration URL<Hint>(optional — MP3 link for listeners)</Hint>
                    </label>
                    <input
                        id='audioUrl'
                        name='audioUrl'
                        type='url'
                        value={form.audioUrl}
                        onChange={handleChange}
                        placeholder='https://example.com/narration.mp3'
                        className={INPUT_STYLE}
                    />
                    <FieldError messages={errors.audio_url} />

                    {/* ...or upload your own recording. accept= only shows
                        sound files in the picker (Django checks again). */}
                    <label htmlFor='audioFile' className='mt-3 block text-xs text-gray-400'>
                        Or upload your own recording (MP3, M4A, OGG or WAV, up to {MAX_AUDIO_MB} MB)
                    </label>
                    <input
                        id='audioFile'
                        type='file'
                        accept='audio/mpeg,audio/mp4,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav'
                        onChange={handleAudioChange}
                        className='mt-1 block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-slate-600'
                    />
                    {audioFile && <p className='mt-1 text-xs text-gray-400'>🎙️ {audioFile.name} - it plays on your story page.</p>}
                    <FieldError messages={errors.audio_file} />
                </div>

                {/* ---------- PREMIUM (not built yet) ---------- */}
                {/* <fieldset disabled> switches off EVERY input inside it
                    at once - no need to put disabled on each one. */}
                <fieldset disabled className='rounded-xl border border-amber-800/60 bg-amber-950/10 p-5'>
                    <legend className='flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-wider text-amber-500'>
                        <Crown className='h-4 w-4' />
                        Premium Options
                        <span className='rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-amber-300'>Coming soon</span>
                    </legend>

                    <div className='space-y-4 opacity-60'>
                        <div>
                            <label htmlFor='price' className={LABEL_STYLE}>Price<Hint>(leave blank to publish free)</Hint></label>
                            <input id='price' placeholder='$ 0.00' className={INPUT_STYLE} />
                        </div>

                        <div className='flex items-center justify-between'>
                            <div>
                                <p className='text-sm font-semibold text-gray-200'>Members-Only Story</p>
                                <p className='text-xs text-gray-500'>Only members can read this story.</p>
                            </div>
                            {/* A fake switch - just two rounded boxes. */}
                            <span className='flex h-5 w-9 items-center rounded-full bg-slate-700 p-0.5'>
                                <span className='h-4 w-4 rounded-full bg-gray-300' />
                            </span>
                        </div>

                        <div>
                            <label htmlFor='earlyAccess' className={LABEL_STYLE}>Early Access Until<Hint>(optional)</Hint></label>
                            <input id='earlyAccess' type='datetime-local' className={`${INPUT_STYLE} [color-scheme:dark]`} />
                        </div>
                    </div>
                </fieldset>

                {/* ---------- SUBMIT ---------- */}
                {/* border-gray-800: a thin line just above the button. */}
                <div className='flex flex-col-reverse items-center gap-3 border-t border-gray-800 pt-6 sm:flex-row sm:justify-between'>
                    <p className='text-xs text-gray-300'>Your draft is saved in this browser as you type.</p>
                    <button type='submit' disabled={saving} className={`${BUTTON_STYLE} w-full sm:w-auto sm:px-8`}>
                        {saving ? 'Publishing...' : form.publishAt ? 'Schedule Story' : 'Publish Story'}
                    </button>
                </div>
            </form>
        </div>
        </div>
    )
}

export default WriteStory
