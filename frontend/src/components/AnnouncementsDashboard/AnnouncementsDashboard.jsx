import { useState, useEffect } from 'react'
import { Megaphone, Trash2 } from 'lucide-react'
import { getAdminList, createAdminItem, updateAdminItem, deleteAdminItem } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { BANNER_STYLES } from '../AnnouncementBanner/bannerStyles'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> ANNOUNCEMENT (/dashboard/announcements).
//
// The banner across the top of every page of the site, e.g.
//   "Writing challenge: The Fog - ends Friday!   [See the challenge]"
//
// Only ONE is shown at a time. Switching one on switches the others
// off (Django does that - see only_this_one_active in
// sitecontent/views.py). Old ones stay in the list to reuse.
//
// The banner itself: components/AnnouncementBanner.
// ---------------------------------------------------------------

const EMPTY_FORM = { message: '', link_url: '', link_label: '', style: 'info', is_active: true }


function AnnouncementsDashboard() {
    const [items, setItems] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getAdminList('announcements')
            .then(data => setItems(data))
            .catch(() => setError('Could not load the announcements.'))
    }, [reloadKey])

    function updateForm(name, value) {
        setForm(current => ({ ...current, [name]: value }))
    }

    async function handleCreate(event) {
        event.preventDefault()
        setError('')
        try {
            await createAdminItem('announcements', form)
            setForm(EMPTY_FORM)
            setNotice(form.is_active ? 'Announcement is live on the site.' : 'Saved (switched off).')
            reload()
        } catch (err) {
            // Django's field errors, e.g. { message: ['This field may not be blank.'] }
            setError(err.data ? Object.values(err.data).flat().join(' ') : 'Could not save.')
        }
    }

    async function toggleActive(item) {
        await updateAdminItem('announcements', item.id, { is_active: !item.is_active })
        setNotice(item.is_active ? 'Banner switched off.' : 'Banner switched on (the others are off now).')
        reload()
    }

    async function handleDelete(item) {
        if (!window.confirm('Delete this announcement?')) return
        await deleteAdminItem('announcements', item.id)
        reload()
    }

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Megaphone className='h-7 w-7 text-red-500' />
                Announcement
            </h1>
            <p className='mt-1 text-gray-400'>The banner at the top of every page. One at a time.</p>

            <PageMessages error={error} notice={notice} />

            {/* ---------- NEW ANNOUNCEMENT ---------- */}
            <form onSubmit={handleCreate} className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <div>
                    <label htmlFor='message' className={LABEL_STYLE}>Message</label>
                    <input
                        id='message'
                        value={form.message}
                        onChange={event => updateForm('message', event.target.value)}
                        maxLength={300}
                        placeholder='e.g. The October writing challenge is open - theme: The Fog'
                        className={INPUT_STYLE}
                    />
                </div>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div>
                        <label htmlFor='link_url' className={LABEL_STYLE}>Link <span className='font-normal text-gray-500'>(optional)</span></label>
                        <input id='link_url' value={form.link_url} onChange={event => updateForm('link_url', event.target.value)} placeholder='/challenges' className={INPUT_STYLE} />
                    </div>
                    <div>
                        <label htmlFor='link_label' className={LABEL_STYLE}>Link text</label>
                        <input id='link_label' value={form.link_label} onChange={event => updateForm('link_label', event.target.value)} maxLength={50} placeholder='See the challenge' className={INPUT_STYLE} />
                    </div>
                </div>

                {/* The colour: one button per style, showing its real colour. */}
                <div>
                    <p className={LABEL_STYLE}>Colour</p>
                    <div className='flex gap-2'>
                        {Object.entries(BANNER_STYLES).map(([value, style]) => (
                            <button
                                key={value}
                                type='button'
                                onClick={() => updateForm('style', value)}
                                aria-pressed={form.style === value}
                                className={`rounded-lg border px-4 py-2 text-sm ${style.classes} ${form.style === value ? 'ring-2 ring-white' : 'opacity-60'}`}
                            >
                                {style.label}
                            </button>
                        ))}
                    </div>
                </div>

                <label className='flex items-center gap-2 text-sm text-gray-300'>
                    <input type='checkbox' checked={form.is_active} onChange={event => updateForm('is_active', event.target.checked)} className='h-4 w-4 accent-red-600' />
                    Show it on the site right away
                </label>

                <button type='submit' disabled={!form.message.trim()} className={BUTTON_STYLE}>Save announcement</button>
            </form>

            {/* ---------- ALL ANNOUNCEMENTS ---------- */}
            <ul className='mt-8 space-y-3'>
                {items?.map(item => (
                    <li key={item.id} className='rounded-xl border border-slate-800 bg-slate-900/40 p-4'>
                        {/* A small preview, in its real colour. */}
                        <p className={`rounded-lg border px-3 py-2 text-sm ${BANNER_STYLES[item.style].classes}`}>
                            {item.message}
                            {item.link_label && <span className='ml-2 underline'>{item.link_label}</span>}
                        </p>
                        <div className='mt-3 flex items-center gap-3'>
                            <span className={`text-xs font-semibold ${item.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                                {item.is_active ? '● LIVE' : 'Off'}
                            </span>
                            <button type='button' onClick={() => toggleActive(item)} className='rounded-md border border-slate-600 px-3 py-1 text-xs text-gray-300 hover:border-slate-400'>
                                {item.is_active ? 'Switch off' : 'Switch on'}
                            </button>
                            <button type='button' onClick={() => handleDelete(item)} aria-label='Delete' className='ml-auto text-gray-500 hover:text-red-400'>
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </div>
                    </li>
                ))}
                {items?.length === 0 && <p className='text-sm text-gray-500'>No announcements yet.</p>}
            </ul>
        </div>
    )
}

export default AnnouncementsDashboard
