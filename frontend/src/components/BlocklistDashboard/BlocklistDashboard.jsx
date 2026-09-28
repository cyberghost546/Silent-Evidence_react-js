import { useState, useEffect } from 'react'
import { ShieldBan, Trash2 } from 'lucide-react'
import { getBlockedIps, blockIp, unblockIp } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> IP BLOCKLIST (/dashboard/blocklist).
//
// Every request from a blocked IP address gets "403 blocked" -
// the whole site, logged in or not (dashboard/middleware.py).
// Tip: the Login Logs page has a "Block" button next to each IP.
//
// Careful: one IP can be a whole school or office (they share it),
// so block with care. And you can't block your own - Django refuses.
// ---------------------------------------------------------------
function BlocklistDashboard() {
    const [data, setData] = useState(null)   // { my_ip, blocked: [...] }
    const [ip, setIp] = useState('')
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getBlockedIps()
            .then(result => setData(result))
            .catch(() => setError('Could not load the blocklist.'))
    }, [reloadKey])

    async function handleBlock(event) {
        event.preventDefault()
        setError('')
        setNotice('')
        try {
            await blockIp(ip.trim(), reason.trim())
            setNotice(`${ip.trim()} is blocked.`)
            setIp('')
            setReason('')
            setReloadKey(current => current + 1)
        } catch (err) {
            // detail = "your own IP", ip_address = "not a valid IP" / "already blocked"
            setError(err.data?.detail || err.data?.ip_address?.[0] || 'Could not block it.')
        }
    }

    async function handleUnblock(item) {
        await unblockIp(item.id)
        setNotice(`${item.ip_address} is unblocked.`)
        setReloadKey(current => current + 1)
    }

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <ShieldBan className='h-7 w-7 text-red-500' />
                IP Blocklist
            </h1>
            <p className='mt-1 text-gray-400'>
                Requests from these addresses are refused everywhere.
                {data && <> Your IP: <span className='font-mono text-gray-200'>{data.my_ip}</span> (can't be blocked).</>}
            </p>

            <PageMessages error={error} notice={notice} />

            <form onSubmit={handleBlock} className='mt-6 flex flex-col gap-2 sm:flex-row'>
                <input value={ip} onChange={event => setIp(event.target.value)} placeholder='e.g. 203.0.113.9' aria-label='IP address' className={`${INPUT_STYLE} font-mono sm:w-64`} />
                <input value={reason} onChange={event => setReason(event.target.value)} maxLength={200} placeholder='Reason (only admins see it)' aria-label='Reason' className={`${INPUT_STYLE} min-w-0 flex-1`} />
                <button type='submit' disabled={!ip.trim()} className={`${BUTTON_STYLE} shrink-0`}>Block</button>
            </form>

            <div className='mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40'>
                <table className='w-full min-w-[40rem] text-left text-sm'>
                    <thead>
                        <tr className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                            <th className='px-4 py-3'>IP address</th>
                            <th className='px-4 py-3'>Reason</th>
                            <th className='px-4 py-3'>Blocked by</th>
                            <th className='px-4 py-3'>When</th>
                            <th className='px-4 py-3'><span className='sr-only'>Unblock</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.blocked.map(item => (
                            <tr key={item.id} className='border-t border-slate-800'>
                                <td className='px-4 py-3 font-mono text-gray-100'>{item.ip_address}</td>
                                <td className='px-4 py-3 text-gray-300'>{item.reason || <span className='text-gray-500'>—</span>}</td>
                                <td className='px-4 py-3 text-gray-400'>{item.blocked_by ?? '—'}</td>
                                <td className='whitespace-nowrap px-4 py-3 text-gray-400'>{new Date(item.created_at).toLocaleDateString()}</td>
                                <td className='px-4 py-3 text-right'>
                                    <button type='button' onClick={() => handleUnblock(item)} className='inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-400'>
                                        <Trash2 className='h-3.5 w-3.5' /> Unblock
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data?.blocked.length === 0 && <p className='py-10 text-center text-gray-500'>Nobody is blocked.</p>}
            </div>
        </div>
    )
}

export default BlocklistDashboard
