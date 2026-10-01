import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Gavel, Check } from 'lucide-react'
import { getJudging, scoreEntry } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { usePageTitle } from '../../hooks/usePageTitle'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import { INPUT_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// JUDGING A CHALLENGE (/challenges/:id/judge) - judges only.
// Read each entry, give it 1-10 and (if you like) a private note.
// Only admins see the scores; they announce the winner.
// Django: sitecontent/judging_views.py.
// ---------------------------------------------------------------

// One entry: its own score + note + Save, so each row keeps its own typing.
function EntryRow({ challengeId, row, open, onSaved }) {
    const [score, setScore] = useState(row.score ?? '')
    const [note, setNote] = useState(row.note)
    const [status, setStatus] = useState('')

    async function handleSave() {
        setStatus('')
        try {
            await scoreEntry(challengeId, row.entry_id, Number(score), note)
            setStatus('saved')
            onSaved()
        } catch (err) {
            setStatus(err.data?.detail || 'Could not save.')
        }
    }

    return (
        <li className='rounded-xl border border-slate-800 bg-slate-900/60 p-4'>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
                <Link to={`/stories/${row.story.id}`} target='_blank' className='font-semibold text-white hover:text-red-300'>{row.story.title} ↗</Link>
                <span className='text-xs text-gray-400'>by {row.story.author} · {row.story.reading_time} min read</span>
            </div>
            {row.is_mine ? (
                <p className='mt-2 text-sm text-gray-400'>Your own entry - another judge scores this one.</p>
            ) : (
                <div className='mt-3 flex flex-wrap items-end gap-3'>
                    <label className='text-xs text-gray-400'>
                        Score
                        <select value={score} onChange={event => setScore(event.target.value)} disabled={!open} className='mt-1 block rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-gray-100 [color-scheme:dark]'>
                            <option value=''>-</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <label className='min-w-48 flex-1 text-xs text-gray-400'>
                        Private note (only admins read it)
                        <input value={note} onChange={event => setNote(event.target.value)} disabled={!open} maxLength={500} className={`${INPUT_STYLE} mt-1 py-1.5! text-sm`} />
                    </label>
                    <button type='button' onClick={handleSave} disabled={!open || !score} className='rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50'>
                        Save
                    </button>
                    {status === 'saved' && <span className='flex items-center gap-1 text-xs text-green-400'><Check className='h-3.5 w-3.5' /> Saved</span>}
                    {status && status !== 'saved' && <span className='text-xs text-red-400'>{status}</span>}
                </div>
            )}
        </li>
    )
}

function JudgePage() {
    const { id } = useParams()
    usePageTitle('Judging')
    const { data, error, reload } = useApi(() => getJudging(id), [id])

    if (error) return <PageLayout title='Judging'><PageMessage title='Not available' text='Only the judges of this challenge can open this page.' /></PageLayout>
    if (!data) return <PageLayout title='Judging'><PageMessage title='Loading...' /></PageLayout>

    const toScore = data.entries.filter(row => !row.is_mine)
    const done = toScore.filter(row => row.score !== null).length

    return (
        <PageLayout title={`Judging: ${data.title}`} subtitle={data.theme} width='narrow'>
            <p className='mb-6 flex items-center gap-2 text-sm text-gray-300'>
                <Gavel className='h-4 w-4 text-amber-400' />
                {data.judging_open
                    ? `You've scored ${done} of ${toScore.length} ${toScore.length === 1 ? 'entry' : 'entries'}.`
                    : 'Judging is closed (before the deadline, or the winner is already announced).'}
            </p>
            {data.entries.length === 0 && <PageMessage title='No entries' text='Nobody entered this challenge.' />}
            <ul className='space-y-3'>
                {data.entries.map(row => (
                    <EntryRow key={row.entry_id} challengeId={data.id} row={row} open={data.judging_open} onSaved={reload} />
                ))}
            </ul>
        </PageLayout>
    )
}

export default JudgePage
