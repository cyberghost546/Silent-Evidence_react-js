import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Radio } from 'lucide-react'
import { getReadAlongs, createReadAlong } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { usePageTitle } from '../../hooks/usePageTitle'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'
import { whenLabel } from '../../utils/readAlongTime'


// ---------------------------------------------------------------
// READ-ALONGS (/read-alongs) - read one story together at a set time,
// chatting as you go. Upcoming and live rooms are listed here.
//
// /read-alongs?story=12 (from a story's Actions menu: "Host a
// read-along") also shows the form to host one for that story.
// Django: stories/readalong_views.py.
// ---------------------------------------------------------------

function HostForm({ storyId }) {
    const navigate = useNavigate()
    const [startsAt, setStartsAt] = useState('')
    const [problem, setProblem] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        setProblem('')
        try {
            // datetime-local gives "2026-10-03T23:30" in YOUR time zone;
            // new Date(...).toISOString() turns it into UTC for Django.
            const room = await createReadAlong(Number(storyId), new Date(startsAt).toISOString())
            navigate(`/read-alongs/${room.id}`)
        } catch (err) {
            setProblem(err.data?.detail || 'Could not create it.')
        }
    }

    return (
        <form onSubmit={handleSubmit} className='mb-8 space-y-3 rounded-2xl border border-red-900/60 bg-slate-900/60 p-5'>
            <p className='font-semibold text-white'>Host a read-along for this story</p>
            <div>
                <label htmlFor='readalong-when' className={LABEL_STYLE}>When?</label>
                <input id='readalong-when' type='datetime-local' value={startsAt} onChange={event => setStartsAt(event.target.value)} className={`${INPUT_STYLE} [color-scheme:dark]`} />
                <p className='mt-1 text-xs text-gray-400'>The chat is open for 90 minutes from then. Midnight works well...</p>
            </div>
            {problem && <p className='text-sm text-red-400'>{problem}</p>}
            <button type='submit' disabled={!startsAt} className={BUTTON_STYLE}>Create the read-along</button>
        </form>
    )
}

function ReadAlongsPage() {
    usePageTitle('Read-alongs')
    const { user } = useAuth()
    const [params] = useSearchParams()
    const storyId = params.get('story')
    const { data: rooms, error } = useApi(() => getReadAlongs())

    return (
        <PageLayout title='Read-alongs' subtitle='Read a story together at the same time, and see how scared everyone was at the end.' width='narrow'>
            {storyId && user && <HostForm storyId={storyId} />}
            {storyId && !user && <PageMessage title='Log in to host a read-along' />}

            {error && <PageMessage title='Could not load the read-alongs' text={error} />}
            {rooms?.length === 0 && (
                <PageMessage title='Nothing planned yet' text='Open any story, press Actions, and choose "Host a read-along".' />
            )}
            <ul className='space-y-3'>
                {rooms?.map(room => (
                    <li key={room.id}>
                        <Link to={`/read-alongs/${room.id}`} className='flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-red-800'>
                            <div className='min-w-0 flex-1'>
                                <p className='truncate font-semibold text-white'>{room.story.title}</p>
                                <p className='text-xs text-gray-400'>hosted by {room.host} · {whenLabel(room.starts_at)}</p>
                            </div>
                            {room.status === 'live' && <span className='flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white'><Radio className='h-3.5 w-3.5' /> LIVE</span>}
                            <span className='flex items-center gap-1 text-xs text-gray-300'><Users className='h-4 w-4' /> {room.joined_count}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </PageLayout>
    )
}

export default ReadAlongsPage
