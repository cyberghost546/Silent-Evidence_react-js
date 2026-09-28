import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Radio, Send, Skull } from 'lucide-react'
import { getReadAlong, joinReadAlong, sendReadAlongMessage } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import { whenLabel } from '../../utils/readAlongTime'
import { INPUT_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ONE READ-ALONG ROOM (/read-alongs/:id)
//
//   upcoming - who's coming, a Join button
//   live     - the story link + the CHAT, refreshed every 4 seconds
//              (like Messages: we ask Django "anything new since
//              message X?" - simple, no special server needed)
//   ended    - THE REVEAL: everyone's fear rating for the story
// ---------------------------------------------------------------
const REFRESH_EVERY = 4000

function ReadAlongRoom() {
    const { id } = useParams()
    const { user } = useAuth()
    const requireLogin = useRequireLogin()
    const [room, setRoom] = useState(null)
    const [messages, setMessages] = useState([])
    const [notFound, setNotFound] = useState(false)
    const [text, setText] = useState('')
    const [problem, setProblem] = useState('')
    const listRef = useRef(null)
    // The newest message id we have - the next refresh asks for what came after.
    const lastIdRef = useRef(0)
    usePageTitle(room ? `Read-along: ${room.story.title}` : 'Read-along')

    useEffect(() => {
        let ignore = false
        lastIdRef.current = 0

        function load() {
            getReadAlong(id, lastIdRef.current)
                .then(data => {
                    if (ignore) return
                    setRoom(data)
                    if (data.messages.length > 0) {
                        lastIdRef.current = data.messages[data.messages.length - 1].id
                        setMessages(current => [...current, ...data.messages])
                    }
                })
                .catch(err => { if (!ignore && err.status === 404) setNotFound(true) })
        }

        load()
        const timer = setInterval(load, REFRESH_EVERY)
        return () => {
            ignore = true
            clearInterval(timer)
        }
    }, [id])

    // New message -> scroll the chat box (only the box) to the bottom.
    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    }, [messages.length])

    async function handleJoin() {
        if (!requireLogin()) return
        const updated = await joinReadAlong(id)
        setRoom(current => ({ ...current, ...updated, story: current.story }))
    }

    async function handleSend(event) {
        event.preventDefault()
        setProblem('')
        try {
            const message = await sendReadAlongMessage(id, text.trim())
            lastIdRef.current = message.id
            setMessages(current => [...current, message])
            setText('')
        } catch (err) {
            setProblem(err.data?.detail || 'Could not send.')
        }
    }

    if (notFound) return <PageLayout title='Read-along'><PageMessage title='Read-along not found' /></PageLayout>
    if (!room) return <PageLayout title='Read-along'><PageMessage title='Loading...' /></PageLayout>

    const isHost = user?.username === room.host

    return (
        <PageLayout title={room.story.title} subtitle={`A read-along hosted by ${room.host} · ${whenLabel(room.starts_at)}`} width='narrow'>
            <div className='mb-6 flex flex-wrap items-center gap-3'>
                {room.status === 'live' && <span className='flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white'><Radio className='h-4 w-4' /> LIVE NOW</span>}
                {room.status === 'upcoming' && <span className='rounded-full border border-slate-600 px-3 py-1 text-sm text-gray-200'>Starts {whenLabel(room.starts_at)}</span>}
                {room.status === 'ended' && <span className='rounded-full border border-slate-700 px-3 py-1 text-sm text-gray-400'>Ended</span>}
                <span className='text-sm text-gray-300'>{room.joined_count} {room.joined_count === 1 ? 'reader' : 'readers'}</span>
                {room.status !== 'ended' && !isHost && (
                    <button type='button' onClick={handleJoin} className={`ml-auto rounded-lg px-4 py-2 text-sm font-semibold ${room.i_joined ? 'border border-slate-600 text-gray-200' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                        {room.i_joined ? "You're in (leave)" : 'Join'}
                    </button>
                )}
            </div>

            <Link to={`/stories/${room.story.id}`} target='_blank' className='mb-6 block rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-red-800'>
                <p className='font-semibold text-white'>Open the story ↗</p>
                <p className='text-xs text-gray-400'>by {room.story.author} · {room.story.reading_time} min read - read it in another tab, chat here.</p>
            </Link>

            {/* ---------- THE REVEAL ---------- */}
            {room.reveal && (
                <section className='mb-6 rounded-2xl border border-red-900/60 bg-red-950/20 p-5'>
                    <h2 className='flex items-center gap-2 font-bold text-white'><Skull className='h-5 w-5 text-red-500' /> The reveal: how scared was everyone?</h2>
                    {room.reveal.ratings.length === 0 ? (
                        <p className='mt-2 text-sm text-gray-300'>Nobody rated it on the fear meter.</p>
                    ) : (
                        <>
                            <p className='mt-2 text-3xl font-bold text-red-400'>{room.reveal.average.toFixed(1)} / 5</p>
                            <ul className='mt-2 flex flex-wrap gap-2 text-sm'>
                                {room.reveal.ratings.map(r => <li key={r.username} className='rounded-full border border-slate-700 px-2.5 py-0.5 text-gray-200'>{r.username}: {'💀'.repeat(r.score)}</li>)}
                            </ul>
                        </>
                    )}
                </section>
            )}

            {/* ---------- THE CHAT ---------- */}
            <section className='rounded-2xl border border-slate-800 bg-slate-900/60'>
                <div ref={listRef} className='max-h-96 min-h-40 space-y-2 overflow-y-auto p-4' aria-live='polite'>
                    {messages.length === 0 && (
                        <p className='py-8 text-center text-sm text-gray-400'>
                            {room.status === 'upcoming' ? 'The chat opens when the read-along starts.' : 'No messages yet.'}
                        </p>
                    )}
                    {messages.map(message => (
                        <p key={message.id} className='text-sm'>
                            <span className={`font-semibold ${message.author === room.host ? 'text-red-300' : 'text-gray-100'}`}>{message.author}</span>
                            <span className='text-gray-300'>: {message.body}</span>
                        </p>
                    ))}
                </div>
                {room.status === 'live' && room.i_joined && (
                    <form onSubmit={handleSend} className='flex gap-2 border-t border-slate-800 p-3'>
                        <input value={text} onChange={event => setText(event.target.value)} maxLength={500} placeholder='Say something (no spoilers for slow readers!)' aria-label='Chat message' className={`${INPUT_STYLE} py-2!`} />
                        <button type='submit' disabled={!text.trim()} aria-label='Send' className='rounded-lg bg-red-600 px-3 text-white hover:bg-red-700 disabled:opacity-50'>
                            <Send className='h-4 w-4' />
                        </button>
                    </form>
                )}
                {problem && <p className='px-4 pb-3 text-sm text-red-400'>{problem}</p>}
            </section>
        </PageLayout>
    )
}

export default ReadAlongRoom
