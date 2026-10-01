import { useState } from 'react'
import { Bug, ChevronDown, Check, Trash2 } from 'lucide-react'
import { getErrorLog, markErrorFixed, clearErrorLog } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { AdminFilters, PageMessages } from '../Dashboard/AdminParts'
import { timeAgo } from '../../utils/format'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> ERROR LOG (/dashboard/errors).
//
// Crashes, newest first:
//   Browser - a React page broke for someone (ErrorBoundary.jsx)
//   Server  - Django crashed with an error 500 (ErrorLogMiddleware)
// The same crash again isn't a new row: "12×" = it happened 12 times.
//
// Click a row to see the details ("stack trace" = which file and line).
// "Fixed" removes it; if it happens again, it comes back.
// ---------------------------------------------------------------
const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'frontend', label: 'Browser' },
    { value: 'backend', label: 'Server' },
]

// Text + colour, so the colour isn't the only clue.
const SOURCE_LOOK = {
    frontend: { label: 'Browser', style: 'border-blue-800 text-blue-300' },
    backend: { label: 'Server', style: 'border-red-800 text-red-300' },
}


function ErrorLogDashboard() {
    const [source, setSource] = useState('all')
    const { data: errors, error: loadError, reload } = useApi(() => getErrorLog(source), [source])
    const [openId, setOpenId] = useState(null)
    const [notice, setNotice] = useState('')

    async function handleFixed(report) {
        await markErrorFixed(report.id)
        setNotice('Marked as fixed.')
        reload()
    }

    async function handleClearAll() {
        if (!window.confirm('Remove every error from the log?')) return
        await clearErrorLog()
        setNotice('The error log is empty.')
        reload()
    }

    return (
        <div className='max-w-5xl'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                    <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                        <Bug className='h-7 w-7 text-red-500' />
                        Error Log
                    </h1>
                    <p className='mt-1 text-gray-400'>Crashes in the browser and on the server - so you hear about them first.</p>
                </div>
                {errors?.length > 0 && (
                    <button type='button' onClick={handleClearAll} className='flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-gray-300 hover:border-red-700 hover:text-red-300'>
                        <Trash2 className='h-4 w-4' /> Clear all
                    </button>
                )}
            </div>

            <PageMessages error={loadError} notice={notice} />

            <div className='mt-6'>
                <AdminFilters filters={FILTERS} value={source} onChange={setSource} />
            </div>

            <ul className='mt-4 divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40'>
                {errors?.length === 0 && <li className='py-10 text-center text-green-400'>✓ No errors. Nothing broke.</li>}
                {errors?.map(report => {
                    const isOpen = openId === report.id
                    const look = SOURCE_LOOK[report.source]
                    return (
                        <li key={report.id}>
                            <div className='flex items-center gap-3 px-4 py-3'>
                                <button
                                    type='button'
                                    onClick={() => setOpenId(isOpen ? null : report.id)}
                                    aria-expanded={isOpen}
                                    className='flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left text-sm'
                                >
                                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[11px] ${look.style}`}>{look.label}</span>
                                    <span className='min-w-0 flex-1 truncate font-mono text-gray-100'>{report.message}</span>
                                    {report.count > 1 && <span className='shrink-0 rounded-full bg-red-950 px-2 text-xs font-semibold text-red-300'>{report.count}×</span>}
                                    <span className='shrink-0 text-xs text-gray-500'>{timeAgo(report.last_seen)}</span>
                                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <button type='button' onClick={() => handleFixed(report)} className='flex shrink-0 items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-gray-300 hover:border-green-700 hover:text-green-300'>
                                    <Check className='h-3.5 w-3.5' /> Fixed
                                </button>
                            </div>

                            {isOpen && (
                                <div className='border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-gray-400'>
                                    <p><span className='text-gray-500'>Where:</span> <span className='font-mono text-gray-300'>{report.url || '—'}</span></p>
                                    <p className='mt-1'>
                                        <span className='text-gray-500'>Who:</span> {report.user ?? 'a visitor (not logged in)'} ·{' '}
                                        <span className='text-gray-500'>First:</span> {new Date(report.first_seen).toLocaleString()}
                                    </p>
                                    {report.details && (
                                        <pre className='mt-2 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-gray-300'>{report.details}</pre>
                                    )}
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default ErrorLogDashboard
