import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { HeartPulse, CircleCheck, TriangleAlert, CircleX, Info, RefreshCw } from 'lucide-react'
import { getSiteHealth } from '../../api/client'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> SITE HEALTH (/dashboard/health).
//
// A list of checks Django runs (SiteHealthView in
// backend/dashboard/tools_views.py), grouped:
//   Server           - database, migrations, versions, sizes
//   Settings         - things to change before going online
//   Waiting for you  - reports, tickets, messages... (with links)
//   Jobs             - digests, failed emails, bans
// Every check is ok / warning / problem / info - never just a colour:
// each has its own icon AND word, so it's clear without colour too.
// ---------------------------------------------------------------

// How each status looks, as data.
const STATUS = {
    ok: { icon: CircleCheck, label: 'OK', color: 'text-green-400' },
    warning: { icon: TriangleAlert, label: 'Check', color: 'text-amber-300' },
    problem: { icon: CircleX, label: 'Problem', color: 'text-red-400' },
    info: { icon: Info, label: 'Info', color: 'text-slate-400' },
}

const HEADLINES = {
    ok: 'Everything looks healthy.',
    warning: 'Healthy, with a few things to look at.',
    problem: 'Something needs fixing.',
}


function SiteHealthDashboard() {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getSiteHealth()
            .then(result => setData(result))
            .catch(() => setError('Could not run the checks. Is Django running?'))
    }, [reloadKey])

    if (!data) return <p className='text-gray-400'>{error || 'Running checks...'}</p>

    // The group names in the order they first appear.
    // new Set(...) removes duplicates; [...set] turns it into a list.
    const groups = [...new Set(data.checks.map(item => item.group))]
    const Headline = STATUS[data.overall]

    return (
        <div className='max-w-4xl'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                    <HeartPulse className='h-7 w-7 text-red-500' />
                    Site Health
                </h1>
                <button type='button' onClick={() => setReloadKey(current => current + 1)} className='flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-gray-300 hover:border-slate-500'>
                    <RefreshCw className='h-4 w-4' /> Check again
                </button>
            </div>

            {/* ---------- THE HEADLINE ---------- */}
            <p className={`mt-4 flex items-center gap-2 text-lg font-semibold ${Headline.color}`}>
                <Headline.icon className='h-6 w-6' />
                {HEADLINES[data.overall]}
            </p>
            <p className='text-xs text-gray-500'>Checked {new Date(data.checked_at).toLocaleTimeString()}</p>

            {/* ---------- ONE BOX PER GROUP ---------- */}
            <div className='mt-6 space-y-6'>
                {groups.map(group => (
                    <section key={group} className='rounded-2xl border border-slate-800 bg-slate-900/60'>
                        <h2 className='border-b border-slate-800 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-gray-400'>{group}</h2>
                        <ul>
                            {data.checks.filter(item => item.group === group).map(item => {
                                const look = STATUS[item.status]
                                const Icon = look.icon
                                return (
                                    <li key={item.name} className='flex items-start gap-3 border-t border-slate-800/60 px-5 py-3 first:border-t-0'>
                                        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${look.color}`} aria-hidden='true' />
                                        <div className='min-w-0 flex-1'>
                                            <p className='text-sm font-semibold text-white'>
                                                {item.name}
                                                {/* The status as a word too (not colour only). */}
                                                <span className={`ml-2 text-xs font-normal ${look.color}`}>{look.label}</span>
                                            </p>
                                            <p className='text-sm text-gray-400'>{item.detail}</p>
                                        </div>
                                        {item.link && item.status !== 'ok' && (
                                            <Link to={item.link} className='shrink-0 text-xs font-semibold text-red-400 hover:text-red-300'>Open →</Link>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    )
}

export default SiteHealthDashboard
