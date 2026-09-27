import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getMySeries, createSeries } from '../../api/client'
import { LABEL_STYLE, INPUT_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// "Part of a series?" on the Write page.
//
//   <SeriesPicker value={form.series} onChange={id => updateField('series', id)} />
//
// value = the chosen series id ('' = not in a series).
// A dropdown with your series, plus "New series" to make one right
// here without leaving the page. Django numbers the part by itself
// (the next number after the last part).
// ---------------------------------------------------------------
function SeriesPicker({ value, onChange }) {
    const [mySeries, setMySeries] = useState([])
    // The small "new series" box.
    const [adding, setAdding] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        getMySeries()
            .then(setMySeries)
            .catch(() => {})   // no list = just the "not in a series" choice
    }, [])

    async function handleCreate() {
        setError('')
        try {
            const series = await createSeries(newTitle.trim())
            // Add it to the list AND pick it straight away.
            setMySeries([series, ...mySeries])
            onChange(String(series.id))
            setAdding(false)
            setNewTitle('')
        } catch (err) {
            setError(err.data?.title?.[0] || 'Could not make the series.')
        }
    }

    const chosen = mySeries.find(series => String(series.id) === String(value))

    return (
        <div>
            <label htmlFor='series' className={LABEL_STYLE}>
                Part of a series? <span className='font-normal text-gray-500'>(optional)</span>
            </label>
            <div className='flex gap-2'>
                <select id='series' value={value} onChange={event => onChange(event.target.value)} className={INPUT_STYLE}>
                    <option value=''>No - it's a single story</option>
                    {mySeries.map(series => (
                        <option key={series.id} value={series.id}>{series.title}</option>
                    ))}
                </select>
                {!adding && (
                    <button type='button' onClick={() => setAdding(true)} className='flex shrink-0 items-center gap-1 rounded-lg border border-slate-600 px-3 text-sm text-gray-200 hover:border-slate-400'>
                        <Plus className='h-4 w-4' /> New series
                    </button>
                )}
            </div>

            {/* Which part this will be, so there are no surprises. */}
            {chosen && <p className='mt-1 text-xs text-gray-400'>This will be part {chosen.part_count + 1} of "{chosen.title}".</p>}

            {adding && (
                <div className='mt-2 flex gap-2'>
                    <input
                        value={newTitle}
                        onChange={event => setNewTitle(event.target.value)}
                        maxLength={150}
                        placeholder='Name of the series, e.g. The Lighthouse Diaries'
                        aria-label='Name of the new series'
                        autoFocus
                        className={INPUT_STYLE}
                    />
                    <button type='button' onClick={handleCreate} disabled={!newTitle.trim()} className='shrink-0 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50'>
                        Create
                    </button>
                    <button type='button' onClick={() => { setAdding(false); setNewTitle('') }} className='shrink-0 text-sm text-gray-400 hover:text-white'>
                        Cancel
                    </button>
                </div>
            )}
            {error && <p className='mt-1 text-sm text-red-400'>{error}</p>}
        </div>
    )
}

export default SeriesPicker
