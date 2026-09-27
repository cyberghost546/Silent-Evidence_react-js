import { useState, useEffect } from 'react'
import { Ban, Trash2 } from 'lucide-react'
import { getAdminList, createAdminItem, updateAdminItem, deleteAdminItem, testContentFilter } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> CONTENT FILTER (/dashboard/content-filter).
//
// Words that aren't allowed in comments, Last Words and stories:
//   Block - the text is refused ("contains words that are not allowed")
//   Flag  - it's allowed, but a report lands on the Reports page
//           (a flagged Last Word is hidden until you un-hide it)
// Whole words only: blocking "scam" doesn't block "scampi".
//
// The "Try it" box shows what the filter would do with a sentence.
// Django: moderation/content_filter.py.
// ---------------------------------------------------------------

const ACTIONS = [
    { value: 'block', label: 'Block' },
    { value: 'flag', label: 'Flag' },
]


function ContentFilterDashboard() {
    const [words, setWords] = useState(null)
    const [newWord, setNewWord] = useState('')
    const [newAction, setNewAction] = useState('block')
    const [testText, setTestText] = useState('')
    const [testResult, setTestResult] = useState(null)
    const [error, setError] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getAdminList('banned-words')
            .then(data => setWords(data))
            .catch(() => setError('Could not load the list.'))
    }, [reloadKey])

    async function handleAdd(event) {
        event.preventDefault()
        setError('')
        try {
            await createAdminItem('banned-words', { word: newWord.trim(), action: newAction })
            setNewWord('')
            reload()
        } catch (err) {
            // e.g. { word: ['banned word with this word already exists.'] }
            setError(err.data?.word ? 'That word is already on the list.' : 'Could not add it.')
        }
    }

    async function switchAction(word) {
        await updateAdminItem('banned-words', word.id, { action: word.action === 'block' ? 'flag' : 'block' })
        reload()
    }

    async function remove(word) {
        await deleteAdminItem('banned-words', word.id)
        reload()
    }

    async function handleTest(event) {
        event.preventDefault()
        setTestResult(await testContentFilter(testText))
    }

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Ban className='h-7 w-7 text-red-500' />
                Content Filter
            </h1>
            <p className='mt-1 text-gray-400'>Words that aren't allowed in comments, Last Words and stories.</p>

            <PageMessages error={error} notice='' />

            {/* ---------- ADD ---------- */}
            <form onSubmit={handleAdd} className='mt-6 flex flex-wrap items-center gap-3'>
                <input
                    value={newWord}
                    onChange={event => setNewWord(event.target.value)}
                    maxLength={100}
                    placeholder='A word or phrase...'
                    aria-label='Word to add'
                    className={`${INPUT_STYLE} min-w-0 flex-1`}
                />
                <SegmentedControl label='What happens' options={ACTIONS} value={newAction} onChange={setNewAction} />
                <button type='submit' disabled={!newWord.trim()} className={BUTTON_STYLE}>Add</button>
            </form>

            {/* ---------- THE LIST ---------- */}
            <ul className='mt-6 flex flex-wrap gap-2'>
                {words?.length === 0 && <li className='text-sm text-gray-500'>The list is empty - nothing is filtered.</li>}
                {words?.map(word => (
                    // Each word is a "chip": the word, a button to switch
                    // Block/Flag, and an x to remove it.
                    <li key={word.id} className={`flex items-center gap-2 rounded-full border py-1 pl-3 pr-2 text-sm ${
                        word.action === 'block' ? 'border-red-800 bg-red-950/40' : 'border-amber-800 bg-amber-950/30'
                    }`}>
                        <span className='font-mono text-white'>{word.word}</span>
                        <button
                            type='button'
                            onClick={() => switchAction(word)}
                            title='Click to switch between Block and Flag'
                            className={`rounded-full px-2 text-[11px] font-semibold uppercase ${word.action === 'block' ? 'bg-red-800 text-red-100' : 'bg-amber-800 text-amber-100'}`}
                        >
                            {word.action}
                        </button>
                        <button type='button' onClick={() => remove(word)} aria-label={`Remove ${word.word}`} className='text-gray-400 hover:text-white'>
                            <Trash2 className='h-3.5 w-3.5' />
                        </button>
                    </li>
                ))}
            </ul>

            {/* ---------- TRY IT ---------- */}
            <form onSubmit={handleTest} className='mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
                <p className='font-semibold text-white'>Try it</p>
                <p className='text-xs text-gray-400'>Type a sentence to see what the filter would do.</p>
                <div className='mt-3 flex gap-2'>
                    <input value={testText} onChange={event => setTestText(event.target.value)} aria-label='Test sentence' className={INPUT_STYLE} />
                    <button type='submit' disabled={!testText.trim()} className='shrink-0 rounded-lg border border-slate-600 px-4 text-sm text-gray-200 hover:border-slate-400'>Check</button>
                </div>
                {testResult && (
                    <p className={`mt-3 text-sm font-semibold ${
                        testResult.action === 'block' ? 'text-red-400' : testResult.action === 'flag' ? 'text-amber-300' : 'text-green-400'
                    }`}>
                        {testResult.action === 'block' && `Blocked - because of: ${testResult.words.join(', ')}`}
                        {testResult.action === 'flag' && `Allowed, but flagged for review - because of: ${testResult.words.join(', ')}`}
                        {testResult.action === null && 'Allowed - no banned words found.'}
                    </p>
                )}
            </form>
        </div>
    )
}

export default ContentFilterDashboard
