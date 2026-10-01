import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShieldX, TriangleAlert } from 'lucide-react'
import { getDiscipline, warnMember, banMember, liftBan } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import { INPUT_STYLE, LABEL_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> WARNINGS & BANS (/dashboard/discipline).
//
//   Warn - the member sees your message in a pop-up the next time
//          they visit, and has to press "I understand".
//   Ban  - they can't log in (and are logged out everywhere) for
//          1 day, 7 days, 30 days, or for good. "Lift" ends it early.
//          A timed ban ends by itself.
// Admins can't be banned here - remove their admin role first
// (Users page), so nobody can lock the team out.
// ---------------------------------------------------------------

// What the form does: send a warning, or a ban.
const MODES = [
    { value: 'warn', label: 'Warn' },
    { value: 'ban', label: 'Ban' },
]

// Ban length in days. 0 = permanent.
const DURATIONS = [
    { value: '1', label: '1 day' },
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: '0', label: 'Permanent' },
]


function DisciplineDashboard() {
    const [data, setData] = useState(null)
    const [mode, setMode] = useState('warn')
    const [username, setUsername] = useState('')
    const [text, setText] = useState('')
    const [days, setDays] = useState('7')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getDiscipline()
            .then(result => setData(result))
            .catch(() => setError('Could not load warnings and bans.'))
    }, [reloadKey])

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')
        const name = username.trim()

        if (mode === 'ban' && !window.confirm(`Ban ${name} ${days === '0' ? 'permanently' : `for ${days} days`}?`)) return

        try {
            if (mode === 'warn') {
                await warnMember(name, text.trim())
                setNotice(`${name} will see your warning next time they visit.`)
            } else {
                await banMember(name, text.trim(), days)
                setNotice(`${name} is banned.`)
            }
            setUsername('')
            setText('')
            reload()
        } catch (err) {
            // e.g. "No member with that username." / "Admins can't be banned."
            setError(err.data?.detail || 'Could not do that.')
        }
    }

    async function handleLift(ban) {
        if (!window.confirm(`Lift the ban on ${ban.user}?`)) return
        await liftBan(ban.id)
        setNotice(`${ban.user} can log in again.`)
        reload()
    }

    if (!data) return <p className='text-gray-400'>{error || 'Loading...'}</p>

    const activeBans = data.bans.filter(ban => ban.is_active)

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <ShieldX className='h-7 w-7 text-red-500' />
                Warnings &amp; Bans
            </h1>
            <p className='mt-1 text-gray-400'>{activeBans.length} active {activeBans.length === 1 ? 'ban' : 'bans'}.</p>

            <PageMessages error={error} notice={notice} />

            {/* ---------- WARN / BAN FORM ---------- */}
            <form onSubmit={handleSubmit} className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <SegmentedControl label='Warn or ban' options={MODES} value={mode} onChange={setMode} />

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-[14rem_1fr]'>
                    <div>
                        <label htmlFor='member' className={LABEL_STYLE}>Username</label>
                        <input id='member' value={username} onChange={event => setUsername(event.target.value)} className={INPUT_STYLE} />
                    </div>
                    <div>
                        <label htmlFor='text' className={LABEL_STYLE}>{mode === 'warn' ? 'Message to the member' : 'Reason (shown to other admins)'}</label>
                        <input id='text' value={text} onChange={event => setText(event.target.value)} maxLength={2000} className={INPUT_STYLE} />
                    </div>
                </div>

                {mode === 'ban' && (
                    <div>
                        <p className={LABEL_STYLE}>How long</p>
                        <SegmentedControl label='Ban length' options={DURATIONS} value={days} onChange={setDays} />
                    </div>
                )}

                {/* Two complete class lists for the two modes. */}
                <button
                    type='submit'
                    disabled={!username.trim() || !text.trim()}
                    className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${
                        mode === 'ban' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-black hover:bg-amber-500'
                    }`}
                >
                    {mode === 'ban' ? 'Ban member' : 'Send warning'}
                </button>
            </form>

            {/* ---------- BANS ---------- */}
            <h2 className='mt-10 font-semibold text-white'>Bans</h2>
            <ul className='mt-3 space-y-2'>
                {data.bans.length === 0 && <li className='text-sm text-gray-500'>Nobody has been banned.</li>}
                {data.bans.map(ban => (
                    <li key={ban.id} className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${ban.is_active ? 'border-red-900 bg-red-950/20' : 'border-slate-800 opacity-60'}`}>
                        <Link to={`/profile/${ban.user}`} className='font-semibold text-white hover:text-red-400'>{ban.user}</Link>
                        <span className='text-gray-400'>{ban.reason}</span>
                        <span className='ml-auto text-xs text-gray-500'>
                            {ban.lifted_at ? 'lifted' : ban.until ? `until ${new Date(ban.until).toLocaleString()}` : 'permanent'} · by {ban.issued_by}
                        </span>
                        {ban.is_active && (
                            <button type='button' onClick={() => handleLift(ban)} className='rounded-md border border-slate-600 px-3 py-1 text-xs text-gray-200 hover:border-slate-400'>Lift</button>
                        )}
                    </li>
                ))}
            </ul>

            {/* ---------- WARNINGS ---------- */}
            <h2 className='mt-10 font-semibold text-white'>Warnings</h2>
            <ul className='mt-3 space-y-2'>
                {data.warnings.length === 0 && <li className='text-sm text-gray-500'>No warnings sent yet.</li>}
                {data.warnings.map(warning => (
                    <li key={warning.id} className='rounded-xl border border-slate-800 px-4 py-3 text-sm'>
                        <p className='flex flex-wrap items-center gap-2'>
                            <TriangleAlert className='h-4 w-4 text-amber-400' />
                            <Link to={`/profile/${warning.user}`} className='font-semibold text-white hover:text-red-400'>{warning.user}</Link>
                            <span className='ml-auto text-xs text-gray-500'>
                                {new Date(warning.created_at).toLocaleDateString()} · {warning.acknowledged_at ? '✓ read' : 'not read yet'}
                            </span>
                        </p>
                        <p className='mt-1 text-gray-300'>{warning.message}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default DisciplineDashboard
