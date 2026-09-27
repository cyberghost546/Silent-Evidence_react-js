import { useState, useEffect } from 'react'
import { Map, TriangleAlert } from 'lucide-react'
import { getLoginMap, blockIp } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import SegmentedControl from '../SegmentedControl/SegmentedControl'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> LOGIN MAP (/dashboard/login-map).
//
// Where do logins come from?
//   Top:    logins per country (bars) - needs the free GeoIP file,
//           see LoginMapView in dashboard/insights_views.py
//   Bottom: every IP address, with how many logins worked / failed,
//           how many accounts it tried, and a Block button.
//
// "Suspicious" = wrong passwords for 3+ accounts, or 10+ failures.
// That's what password guessing looks like.
// ---------------------------------------------------------------

const RANGES = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 365, label: 'Year' },
]

// A small grey label for the kind of address. Text, not just colour.
const KIND_LABELS = {
    local: 'This computer',
    private: 'Private network',
    public: 'Internet',
    unknown: 'Unknown',
}


function LoginMapDashboard() {
    const [days, setDays] = useState(30)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let ignore = false
        getLoginMap(days)
            .then(result => {
                if (!ignore) setData(result)
            })
            .catch(() => setError('Could not load the login map.'))
        return () => {
            ignore = true
        }
    }, [days, reloadKey])

    async function handleBlock(row) {
        if (!window.confirm(`Block ${row.ip_address}? Nobody on that address can use the site until you unblock it (IP Blocklist).`)) return
        setError('')
        setNotice('')
        try {
            await blockIp(row.ip_address, `From Login Map (${row.failed} failed logins)`)
            setNotice(`${row.ip_address} is blocked.`)
            setReloadKey(current => current + 1)
        } catch (err) {
            setError(err.data?.detail || err.data?.ip_address?.[0] || 'Could not block it.')
        }
    }

    // The biggest country total = a full-width bar.
    const biggest = data ? Math.max(1, ...data.countries.map(place => place.successful + place.failed)) : 1

    return (
        <div className='max-w-5xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Map className='h-7 w-7 text-red-500' />
                Login Map
            </h1>
            <p className='mt-1 text-gray-400'>Where logins come from, and which addresses look suspicious.</p>

            <div className='mt-6'>
                <SegmentedControl label='Time range' options={RANGES} value={days} onChange={setDays} />
            </div>

            <PageMessages error={error} notice={notice} />

            {data && (
                <>
                    {/* The three headline numbers. */}
                    <div className='mt-6 grid gap-4 sm:grid-cols-3'>
                        <Stat label='Successful logins' value={data.totals.successful} />
                        <Stat label='Failed logins' value={data.totals.failed} />
                        <Stat label='Different IP addresses' value={data.totals.ips} />
                    </div>

                    {/* No GeoIP file: explain how to get countries. */}
                    {!data.geoip_installed && (
                        <div className='mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-gray-300'>
                            <p className='font-semibold text-white'>Want country names?</p>
                            <p className='mt-1 text-gray-400'>
                                Run <code className='rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs'>pip install geoip2</code>, download the free
                                "GeoLite2 Country" file from maxmind.com and save it as{' '}
                                <code className='rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs'>backend/geoip/GeoLite2-Country.mmdb</code>.
                                Until then, public addresses show as "Unknown country".
                            </p>
                        </div>
                    )}

                    {/* ---------- BY LOCATION ---------- */}
                    <section className='mt-8'>
                        <h2 className='text-lg font-bold text-white'>By location</h2>
                        <ul className='mt-4 space-y-3'>
                            {data.countries.length === 0 && <li className='text-sm text-gray-500'>No logins in this period.</li>}
                            {data.countries.map(place => {
                                const total = place.successful + place.failed
                                return (
                                    <li key={place.country} className='grid grid-cols-[10rem_1fr_7rem] items-center gap-3 text-sm'>
                                        <span className='truncate text-gray-200'>{place.country}</span>
                                        <span className='h-3 rounded bg-slate-800'>
                                            {/* One colour, width = share of the biggest. */}
                                            <span className='block h-full rounded bg-red-600' style={{ width: `${(total / biggest) * 100}%` }} />
                                        </span>
                                        <span className='text-right tabular-nums text-gray-400'>
                                            {total} {place.failed > 0 && <span className='text-gray-500'>({place.failed} failed)</span>}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    </section>

                    {/* ---------- EVERY IP ---------- */}
                    <section className='mt-10'>
                        <h2 className='text-lg font-bold text-white'>IP addresses</h2>
                        <div className='mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40'>
                            <table className='w-full min-w-[48rem] text-left text-sm'>
                                <thead>
                                    <tr className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                                        <th className='px-4 py-3'>IP address</th>
                                        <th className='px-4 py-3'>Where</th>
                                        <th className='px-4 py-3 text-right'>OK</th>
                                        <th className='px-4 py-3 text-right'>Failed</th>
                                        <th className='px-4 py-3 text-right'>Accounts</th>
                                        <th className='px-4 py-3'>Last seen</th>
                                        <th className='px-4 py-3'><span className='sr-only'>Block</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.ips.map(row => (
                                        <tr key={row.ip_address} className='border-t border-slate-800'>
                                            <td className='px-4 py-3 font-mono text-gray-100'>
                                                {row.ip_address}
                                                {row.suspicious && (
                                                    <span className='ml-2 inline-flex items-center gap-1 font-sans text-xs text-amber-300'>
                                                        <TriangleAlert className='h-3.5 w-3.5' /> Suspicious
                                                    </span>
                                                )}
                                            </td>
                                            <td className='px-4 py-3 text-gray-300'>
                                                {row.country}
                                                {/* "Internet" under a country; the others already say it. */}
                                                {row.kind === 'public' && <span className='block text-xs text-gray-500'>{KIND_LABELS.public}</span>}
                                            </td>
                                            <td className='px-4 py-3 text-right tabular-nums text-gray-200'>{row.successful}</td>
                                            <td className='px-4 py-3 text-right tabular-nums text-gray-200'>{row.failed}</td>
                                            <td className='px-4 py-3 text-right tabular-nums text-gray-200'>{row.accounts}</td>
                                            <td className='whitespace-nowrap px-4 py-3 text-gray-400'>{row.last_seen ? new Date(row.last_seen).toLocaleString() : '—'}</td>
                                            <td className='px-4 py-3 text-right'>
                                                {row.blocked ? (
                                                    <span className='text-xs text-red-400'>Blocked</span>
                                                ) : row.kind === 'public' && (
                                                    // Only internet addresses: blocking 127.0.0.1
                                                    // would be blocking yourself.
                                                    <button type='button' onClick={() => handleBlock(row)} className='rounded border border-slate-700 px-2 py-1 text-xs text-gray-400 hover:border-red-700 hover:text-red-400'>
                                                        Block
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {data.ips.length === 0 && <p className='py-10 text-center text-gray-500'>No logins in this period.</p>}
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}


// A number with a label under it.
function Stat({ label, value }) {
    return (
        <div className='rounded-xl border border-slate-800 bg-slate-900/60 p-5'>
            <p className='text-3xl font-bold tabular-nums text-white'>{value}</p>
            <p className='mt-1 text-sm text-gray-400'>{label}</p>
        </div>
    )
}

export default LoginMapDashboard
