import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Link2, Plus } from 'lucide-react'
import { getChains, startChain } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import { usePageTitle } from '../../hooks/usePageTitle'
import { timeAgo } from '../../utils/format'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// STORY CHAINS (/chains) - stories the community writes together.
// One member writes the opening; others add the next part, in turns.
// Open chains first. "Start a chain" opens a small form.
// ---------------------------------------------------------------
function ChainsPage() {
    usePageTitle('Story chains')
    const navigate = useNavigate()
    const requireLogin = useRequireLogin()
    const { data: chains, error } = useApi(() => getChains())

    const [writing, setWriting] = useState(false)
    const [title, setTitle] = useState('')
    const [opening, setOpening] = useState('')
    const [formError, setFormError] = useState('')
    const [sending, setSending] = useState(false)

    async function handleStart(event) {
        event.preventDefault()
        setSending(true)
        setFormError('')
        try {
            const chain = await startChain(title.trim(), opening.trim())
            navigate(`/chains/${chain.id}`)
        } catch (err) {
            setFormError(err.data?.detail || 'Could not start the chain.')
        } finally {
            setSending(false)
        }
    }

    return (
        <PageLayout
            title='Story chains'
            subtitle='One person starts a story. Everyone else writes what happens next - one part at a time.'
            width='narrow'
            action={!writing && (
                <button type='button' onClick={() => requireLogin() && setWriting(true)} className={`${BUTTON_STYLE} flex items-center gap-1.5`}>
                    <Plus className='h-4 w-4' /> Start a chain
                </button>
            )}
        >
            {writing && (
                <form onSubmit={handleStart} className='mb-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
                    <div>
                        <label htmlFor='chain-title' className={LABEL_STYLE}>Title</label>
                        <input id='chain-title' value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder='The House at the End of the Road' className={INPUT_STYLE} />
                    </div>
                    <div>
                        <label htmlFor='chain-opening' className={LABEL_STYLE}>The opening <span className='font-normal text-gray-500'>({opening.length}/1500)</span></label>
                        <textarea id='chain-opening' rows={5} value={opening} onChange={event => setOpening(event.target.value)} maxLength={1500} placeholder='End on a cliffhanger - make people want to continue!' className={INPUT_STYLE} />
                    </div>
                    {formError && <p className='text-sm text-red-400'>{formError}</p>}
                    <div className='flex justify-end gap-3'>
                        <button type='button' onClick={() => setWriting(false)} className='text-sm text-gray-400 hover:text-white'>Cancel</button>
                        <button type='submit' disabled={sending || !title.trim() || !opening.trim()} className={BUTTON_STYLE}>{sending ? 'Starting...' : 'Start the chain'}</button>
                    </div>
                </form>
            )}

            {error && <PageMessage title='Could not load the chains' text={error} />}
            {chains?.length === 0 && <PageMessage title='No chains yet' text='Be the first to start one!' />}

            <ul className='space-y-3'>
                {chains?.map(chain => (
                    <li key={chain.id}>
                        <Link to={`/chains/${chain.id}`} className={`flex items-center gap-4 rounded-2xl border p-5 transition-colors hover:border-red-800 ${chain.is_open ? 'border-slate-800 bg-slate-900/60' : 'border-slate-800/60 bg-slate-900/20'}`}>
                            <Link2 className={`h-6 w-6 shrink-0 ${chain.is_open ? 'text-red-400' : 'text-gray-600'}`} />
                            <span className='min-w-0 flex-1'>
                                <span className='block font-bold text-white'>{chain.title}</span>
                                <span className='block text-xs text-gray-500'>
                                    started by {chain.started_by} · {chain.part_count} of {chain.max_parts} parts · active {timeAgo(chain.last_activity)}
                                </span>
                            </span>
                            {/* Text, not just colour: "Open" / "The End". */}
                            <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${chain.is_open ? 'border-green-800 text-green-300' : 'border-slate-700 text-gray-500'}`}>
                                {chain.is_open ? 'Open' : 'The End'}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </PageLayout>
    )
}

export default ChainsPage
