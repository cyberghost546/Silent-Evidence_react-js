import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, Lock, LockOpen, Crown } from 'lucide-react'
import { getSecurityOverview, unlockLogin } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> SECURITY (/dashboard/security). Admins only.
//
// The login numbers from the last 24 hours, added up:
//   - how many logins worked / failed
//   - what's LOCKED right now (too many wrong passwords) + Unlock
//   - which usernames and IP addresses fail the most
//   - who the admins are, and the latest admin logins
//
// The lock-out itself happens in Django (moderation/security.py):
// after X wrong passwords in Y minutes, that account or IP address
// can't log in for a while. The exact rules are shown on the page.
// ---------------------------------------------------------------


// A number card. `danger` = red when it's worth a look.
function SecurityStat({ icon: Icon, value, label, danger = false }) {
    const color = danger && value > 0 ? 'text-red-400' : 'text-gray-200'
    return (
        <div className='flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-5'>
            <Icon className={`h-7 w-7 ${color}`} />
            <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className='text-sm text-gray-500'>{label}</p>
            </div>
        </div>
    )
}


// A small titled box - every list on this page uses one.
function Box({ title, children }) {
    return (
        <section className='rounded-xl border border-slate-800 bg-slate-900/40 p-5'>
            <h2 className='mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400'>{title}</h2>
            {children}
        </section>
    )
}


// "value - N failures" rows, used by the two top-5 lists.
function FailureList({ rows, mono = false }) {
    if (rows.length === 0) {
        return <p className='text-sm text-gray-500'>No failed logins in the last 24 hours.</p>
    }
    return (
        <ul className='space-y-2'>
            {rows.map(row => (
                <li key={row.value ?? 'unknown'} className='flex items-center justify-between text-sm'>
                    <span className={`${mono ? 'font-mono text-xs' : ''} text-gray-200`}>{row.value ?? 'unknown'}</span>
                    <span className='text-red-400'>{row.failures} failed</span>
                </li>
            ))}
        </ul>
    )
}


function SecurityDashboard() {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getSecurityOverview()
            .then(result => setData(result))
            .catch(() => setError('Could not load the security overview.'))
    }, [reloadKey])

    // what = { username: 'bob' } or { ip: '1.2.3.4' }
    async function handleUnlock(what, label) {
        try {
            await unlockLogin(what)
            setNotice(`${label} can log in again.`)
            setReloadKey(current => current + 1)
        } catch {
            setError('Could not unlock.')
        }
    }

    if (!data) {
        return <p className='text-gray-400'>{error || 'Loading security overview...'}</p>
    }

    const lockedCount = data.locked.usernames.length + data.locked.ips.length
    const rules = data.rules

    return (
        <div className='max-w-5xl'>
            <h1 className='text-3xl font-bold text-white'>Security</h1>
            <p className='mt-1 text-gray-400'>Logins in the last 24 hours, and anything that looks suspicious.</p>

            {/* ---------- THE RULES ---------- */}
            <p className='mt-4 flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-gray-300'>
                <ShieldCheck className='mt-0.5 h-4 w-4 shrink-0 text-green-400' />
                <span>
                    Brute-force protection is on: <b>{rules.max_failures_per_username}</b> wrong passwords on one account, or{' '}
                    <b>{rules.max_failures_per_ip}</b> from one IP address, within <b>{rules.lock_minutes} minutes</b> =
                    locked until those attempts are {rules.lock_minutes} minutes old.
                </span>
            </p>

            <PageMessages error={error} notice={notice} />

            {/* ---------- NUMBERS ---------- */}
            <div className='mt-6 grid gap-4 sm:grid-cols-3'>
                <SecurityStat icon={ShieldCheck} value={data.last_24h.successful} label='Successful logins' />
                <SecurityStat icon={ShieldAlert} value={data.last_24h.failed} label='Failed logins' danger />
                <SecurityStat icon={Lock} value={lockedCount} label='Locked right now' danger />
            </div>

            {/* ---------- LOCKED RIGHT NOW ---------- */}
            {lockedCount > 0 && (
                <section className='mt-6 rounded-xl border border-red-900/70 bg-red-950/20 p-5'>
                    <h2 className='mb-3 flex items-center gap-2 font-semibold text-red-300'>
                        <Lock className='h-4 w-4' />
                        Locked right now
                    </h2>
                    <ul className='space-y-2'>
                        {/* Two lists shown as one: accounts, then IPs. */}
                        {data.locked.usernames.map(row => (
                            <li key={`u-${row.value}`} className='flex items-center justify-between gap-3 text-sm'>
                                <span className='text-gray-200'>Account <b>{row.value}</b> · {row.failures} failed attempts</span>
                                <button
                                    type='button'
                                    onClick={() => handleUnlock({ username: row.value }, row.value)}
                                    className='flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1 text-xs text-gray-200 hover:border-slate-400'
                                >
                                    <LockOpen className='h-3.5 w-3.5' /> Unlock
                                </button>
                            </li>
                        ))}
                        {data.locked.ips.map(row => (
                            <li key={`ip-${row.value}`} className='flex items-center justify-between gap-3 text-sm'>
                                <span className='text-gray-200'>IP <span className='font-mono'>{row.value}</span> · {row.failures} failed attempts</span>
                                <button
                                    type='button'
                                    onClick={() => handleUnlock({ ip: row.value }, row.value)}
                                    className='flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1 text-xs text-gray-200 hover:border-slate-400'
                                >
                                    <LockOpen className='h-3.5 w-3.5' /> Unlock
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* ---------- 4 BOXES IN A GRID ---------- */}
            <div className='mt-6 grid gap-4 lg:grid-cols-2'>
                <Box title='Most failed usernames (24h)'>
                    <FailureList rows={data.top_failed_usernames} />
                </Box>

                <Box title='Most failed IP addresses (24h)'>
                    <FailureList rows={data.top_failed_ips} mono />
                </Box>

                <Box title={`Admins (${data.admins.length})`}>
                    <ul className='space-y-2'>
                        {data.admins.map(admin => (
                            <li key={admin.username} className='flex items-center justify-between text-sm'>
                                <span className='flex items-center gap-2'>
                                    <Crown className='h-3.5 w-3.5 text-red-400' />
                                    <Link to={`/profile/${admin.username}`} className='text-gray-200 hover:text-white'>{admin.username}</Link>
                                    {admin.is_superuser && <span className='text-[10px] text-gray-500'>SUPERUSER</span>}
                                </span>
                                <span className='text-xs text-gray-500'>
                                    {admin.last_login ? `last login ${new Date(admin.last_login).toLocaleDateString()}` : 'never logged in'}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className='mt-3 text-xs text-gray-500'>Change who is an admin on the Users page.</p>
                </Box>

                <Box title='Latest admin logins'>
                    {data.recent_admin_logins.length === 0 ? (
                        <p className='text-sm text-gray-500'>None recorded yet.</p>
                    ) : (
                        <ul className='space-y-2'>
                            {data.recent_admin_logins.map(event => (
                                <li key={event.id} className='flex items-center justify-between text-sm'>
                                    <span className='text-gray-200'>{event.username}</span>
                                    <span className='text-xs text-gray-500'>
                                        <span className='font-mono'>{event.ip_address ?? '—'}</span> · {new Date(event.created_at).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Box>
            </div>

            <p className='mt-6 text-sm text-gray-500'>
                Every single attempt is on the <Link to='/dashboard/login-logs' className='text-red-400 hover:text-red-300'>Login Logs</Link> page.
            </p>
        </div>
    )
}

export default SecurityDashboard
