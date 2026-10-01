import { useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { getChain, addChainPart, setChainOpen } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { usePageTitle } from '../../hooks/usePageTitle'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ONE STORY CHAIN (/chains/:id)
//
// The parts read like ONE story (who wrote each part in small grey
// letters on the left), then a box for the next part. You can't add
// two parts in a row - Django refuses too; here we just explain it.
// ---------------------------------------------------------------
function ChainPage() {
    const { id } = useParams()
    const location = useLocation()
    const { user } = useAuth()
    const { data: chain, error, reload } = useApi(() => getChain(id), [id])
    usePageTitle(chain?.title ?? 'Story chain')

    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [formError, setFormError] = useState('')

    async function handleAdd(event) {
        event.preventDefault()
        setSending(true)
        setFormError('')
        try {
            await addChainPart(id, text.trim())
            setText('')
            reload()
        } catch (err) {
            setFormError(err.data?.detail || 'Could not add your part.')
        } finally {
            setSending(false)
        }
    }

    async function toggleOpen() {
        await setChainOpen(id, !chain.is_open)
        reload()
    }

    if (error) return <PageLayout title='Story chain'><PageMessage title='Chain not found' /></PageLayout>
    if (!chain) return <PageLayout title='Story chain'><PageMessage title='Loading...' /></PageLayout>

    const myTurnIsOver = user && chain.last_author === user.username

    return (
        <PageLayout title={chain.title} subtitle={`A story chain started by ${chain.started_by} · ${chain.part_count} of ${chain.max_parts} parts`} width='narrow'>
            <p className='mb-6 flex items-center justify-between text-sm'>
                <Link to='/chains' className='text-gray-400 hover:text-white'>← All chains</Link>
                {user?.is_staff && (
                    <button type='button' onClick={toggleOpen} className='rounded border border-slate-700 px-2 py-1 text-xs text-gray-400 hover:text-white'>
                        {chain.is_open ? 'Close chain' : 'Re-open chain'}
                    </button>
                )}
            </p>

            {/* The story, part by part. <ol> = numbered, in order. */}
            <ol className='space-y-6 border-l-2 border-red-900/60 pl-6'>
                {chain.parts.map((part, index) => (
                    <li key={part.id} className='relative'>
                        {/* The dot on the red line. */}
                        <span className='absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-red-600 ring-4 ring-[#0f172a]' />
                        <p className='text-xs text-gray-500'>Part {index + 1} · by {part.author}</p>
                        <p className='mt-1 whitespace-pre-line break-words text-lg leading-relaxed text-gray-100'>{part.body}</p>
                    </li>
                ))}
            </ol>

            <div className='mt-10'>
                {!chain.is_open ? (
                    <p className='text-center text-2xl font-bold text-red-500'>~ The End ~</p>
                ) : !user ? (
                    <p className='rounded-xl border border-slate-800 px-4 py-3 text-sm text-gray-400'>
                        <Link to='/login' state={{ from: location.pathname }} className='font-semibold text-red-400 hover:text-red-300'>Log in</Link> to write what happens next.
                    </p>
                ) : myTurnIsOver ? (
                    <p className='rounded-xl border border-slate-800 px-4 py-3 text-sm text-gray-400'>
                        You wrote the last part - wait for someone else to continue, then it's your turn again.
                    </p>
                ) : (
                    <form onSubmit={handleAdd}>
                        <label htmlFor='next-part' className='mb-2 block font-semibold text-white'>What happens next? <span className='text-sm font-normal text-gray-500'>({text.length}/1500)</span></label>
                        <textarea id='next-part' rows={5} value={text} onChange={event => setText(event.target.value)} maxLength={1500} className={INPUT_STYLE} />
                        {formError && <p className='mt-2 text-sm text-red-400'>{formError}</p>}
                        <div className='mt-3 flex justify-end'>
                            <button type='submit' disabled={sending || !text.trim()} className={BUTTON_STYLE}>{sending ? 'Adding...' : 'Add my part'}</button>
                        </div>
                    </form>
                )}
            </div>
        </PageLayout>
    )
}

export default ChainPage
