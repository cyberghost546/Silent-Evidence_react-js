import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send, SquarePen } from 'lucide-react'
import { getConversations, getConversation, sendMessage } from '../../api/client'
import Avatar from '../Avatar/Avatar'
import { INPUT_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// MESSAGES - logged-in users only (App.jsx).
//
//   /messages             -> the list of your conversations
//   /messages/night_owl   -> the list + your chat with night_owl
//
// On a big screen both are side by side. On a phone you see one at
// a time: the list, or the chat (with a "back" arrow).
//
// New messages don't arrive by themselves (that needs WebSockets,
// a whole topic of its own). Instead we simply ask Django again
// every few seconds - "polling". Simple, and fine for a small site.
//
// Django: backend/messaging/views.py.
// ---------------------------------------------------------------

// How often to check for new messages, in milliseconds.
const REFRESH_EVERY = 5000   // 5 seconds


// "2026-09-26T21:05:00Z" -> "21:05" today, "26 Sep" on other days.
function shortTime(isoString) {
    const date = new Date(isoString)
    const isToday = date.toDateString() === new Date().toDateString()
    return isToday
        ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}


// ---------------------------------------------------------------
// LEFT: the list of conversations.
// ---------------------------------------------------------------
function ConversationList({ conversations, activeUsername }) {
    const navigate = useNavigate()
    const [newName, setNewName] = useState('')

    // "New message": type a username, go to /messages/that_name.
    function startConversation(event) {
        event.preventDefault()
        if (newName.trim()) {
            navigate(`/messages/${newName.trim()}`)
            setNewName('')
        }
    }

    return (
        <div className='flex h-full flex-col'>
            <form onSubmit={startConversation} className='flex gap-2 border-b border-slate-800 p-3'>
                <input
                    value={newName}
                    onChange={event => setNewName(event.target.value)}
                    placeholder='New message to...'
                    aria-label='Username to message'
                    className='w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-600 focus:outline-none'
                />
                <button type='submit' aria-label='Start conversation' className='rounded-lg bg-red-600 px-3 text-white hover:bg-red-700'>
                    <SquarePen className='h-4 w-4' />
                </button>
            </form>

            {conversations === null && <p className='p-4 text-sm text-gray-500'>Loading...</p>}

            {conversations?.length === 0 && (
                <p className='p-4 text-sm text-gray-500'>No messages yet. Type a username above to start one.</p>
            )}

            {/* overflow-y-auto: a long list scrolls inside the box. */}
            <ul className='flex-1 overflow-y-auto'>
                {conversations?.map(conversation => {
                    const isActive = conversation.username === activeUsername

                    return (
                        <li key={conversation.username}>
                            <Link
                                to={`/messages/${conversation.username}`}
                                className={`flex items-center gap-3 border-b border-slate-800/60 px-4 py-3 transition-colors ${
                                    isActive ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                                }`}
                            >
                                <Avatar username={conversation.username} image={conversation.avatar} />

                                <div className='min-w-0 flex-1'>
                                    <div className='flex items-center justify-between gap-2'>
                                        <p className='truncate text-sm font-semibold text-white'>{conversation.username}</p>
                                        <p className='shrink-0 text-[11px] text-gray-500'>{shortTime(conversation.last_message.created_at)}</p>
                                    </div>
                                    <div className='flex items-center justify-between gap-2'>
                                        {/* Unread = brighter text, so you notice it. */}
                                        <p className={`truncate text-xs ${conversation.unread > 0 ? 'text-gray-200' : 'text-gray-500'}`}>
                                            {conversation.last_message.is_mine && 'You: '}
                                            {conversation.last_message.body}
                                        </p>
                                        {conversation.unread > 0 && (
                                            <span className='shrink-0 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white'>
                                                {conversation.unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}


// ---------------------------------------------------------------
// RIGHT: one conversation.
//
// Props:
//   username - who we're talking to
//   onSent   - called after sending, so the page refreshes the list
// ---------------------------------------------------------------
function ChatWindow({ username, onSent }) {
    // null = loading. 'not-found' = no such user.
    // Otherwise { username, avatar, blocked, messages: [...] }.
    const [chat, setChat] = useState(null)
    const [text, setText] = useState('')
    const [error, setError] = useState('')
    const [sending, setSending] = useState(false)

    // useRef = a box that holds something WITHOUT causing a re-render
    // when it changes. Here: the scrolling <div> with the messages,
    // so we can scroll it to the bottom (the newest message).
    const listRef = useRef(null)

    // Load the chat, then load it again every 5 seconds.
    useEffect(() => {
        let ignore = false

        function load() {
            getConversation(username)
                .then(data => {
                    if (!ignore) setChat(data)
                })
                .catch(err => {
                    if (!ignore && err.status === 404) setChat('not-found')
                })
        }

        load()

        // setInterval = "run this function again every X ms".
        const timer = setInterval(load, REFRESH_EVERY)

        // Cleanup when you open another chat or leave the page:
        // stop the timer, or it would keep running forever.
        return () => {
            ignore = true
            clearInterval(timer)
        }
    }, [username])

    // How many messages there are. We scroll down only when this
    // number changes - not on every refresh, or the chat would jump
    // to the bottom while you're reading older messages.
    const messageCount = chat?.messages?.length ?? 0

    useEffect(() => {
        const list = listRef.current
        // null before the messages are on screen (still loading).
        if (!list) return

        // scrollTop = how far down the box is scrolled.
        // scrollHeight = how tall ALL its content is.
        // Setting one to the other = "scroll to the very bottom".
        //
        // Why not bottomElement.scrollIntoView()? That scrolls EVERY
        // scrollable thing on the way - including the whole page -
        // so opening a chat would jump the window down. This only
        // moves the message box.
        list.scrollTop = list.scrollHeight
    }, [messageCount])

    async function handleSend(event) {
        event.preventDefault()
        const body = text.trim()
        if (!body) return

        setSending(true)
        setError('')
        try {
            const message = await sendMessage(username, body)
            // Add the new message at the end straight away, instead of
            // waiting up to 5 seconds for the next refresh.
            setChat({ ...chat, messages: [...chat.messages, message] })
            setText('')
            onSent()
        } catch (err) {
            setError(err.data?.detail || 'Could not send. Try again.')
        } finally {
            setSending(false)
        }
    }

    if (chat === null) {
        return <p className='p-6 text-sm text-gray-500'>Loading conversation...</p>
    }

    if (chat === 'not-found') {
        return <p className='p-6 text-sm text-gray-400'>There's nobody called "{username}".</p>
    }

    return (
        <div className='flex h-full flex-col'>
            {/* ---------- TOP BAR ---------- */}
            <div className='flex items-center gap-3 border-b border-slate-800 px-4 py-3'>
                {/* The back arrow, only on phones (md:hidden). */}
                <Link to='/messages' aria-label='Back to conversations' className='text-gray-400 hover:text-white md:hidden'>
                    <ArrowLeft className='h-5 w-5' />
                </Link>
                <Avatar username={chat.username} image={chat.avatar} />
                <Link to={`/profile/${chat.username}`} className='font-semibold text-white hover:text-red-400'>
                    {chat.username}
                </Link>
            </div>

            {/* ---------- THE MESSAGES ---------- */}
            {/* ref={listRef}: this is the box we scroll (see above).
                min-h-0 lets it shrink inside the flex column, so it
                scrolls instead of growing taller than the panel. */}
            <div ref={listRef} className='min-h-0 flex-1 space-y-3 overflow-y-auto p-4'>
                {chat.messages.length === 0 && (
                    <p className='py-10 text-center text-sm text-gray-500'>No messages yet. Say hello!</p>
                )}

                {chat.messages.map(message => (
                    // Mine on the right (justify-end), theirs on the left.
                    <div key={message.id} className={`flex ${message.is_mine ? 'justify-end' : 'justify-start'}`}>
                        {/* max-w-[75%]: a bubble never fills the whole width.
                            whitespace-pre-wrap keeps the line breaks you typed.
                            break-words: a very long word wraps instead of
                            sticking out of the bubble. */}
                        <div
                            className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                                message.is_mine
                                    ? 'rounded-br-sm bg-red-600 text-white'
                                    : 'rounded-bl-sm bg-slate-800 text-gray-100'
                            }`}
                        >
                            {message.body}
                            <p className={`mt-1 text-right text-[10px] ${message.is_mine ? 'text-red-200' : 'text-gray-500'}`}>
                                {shortTime(message.created_at)}
                            </p>
                        </div>
                    </div>
                ))}

            </div>

            {/* ---------- WRITE A MESSAGE ---------- */}
            {chat.blocked ? (
                <p className='border-t border-slate-800 p-4 text-center text-sm text-gray-500'>
                    You can't message this user.
                </p>
            ) : (
                <form onSubmit={handleSend} className='border-t border-slate-800 p-3'>
                    <div className='flex gap-2'>
                        <input
                            value={text}
                            onChange={event => setText(event.target.value)}
                            placeholder={`Message ${chat.username}...`}
                            aria-label='Your message'
                            maxLength={2000}
                            className={INPUT_STYLE}
                        />
                        <button
                            type='submit'
                            disabled={sending || !text.trim()}
                            aria-label='Send'
                            className='shrink-0 rounded-lg bg-red-600 px-4 text-white transition-colors hover:bg-red-700 disabled:opacity-50'
                        >
                            <Send className='h-4 w-4' />
                        </button>
                    </div>
                    {error && <p className='mt-2 text-xs text-red-400'>{error}</p>}
                </form>
            )}
        </div>
    )
}


// ---------------------------------------------------------------
// THE PAGE
// ---------------------------------------------------------------
function MessagesPage() {
    // /messages/:username -> who is open ('undefined' on plain /messages).
    const { username } = useParams()

    const [conversations, setConversations] = useState(null)

    // Changing this number reloads the list (after you send one).
    const [refreshKey, setRefreshKey] = useState(0)

    // Load the list, and again every 5 seconds (new messages from
    // others), and again after you send one (refreshKey).
    useEffect(() => {
        function load() {
            getConversations()
                .then(data => setConversations(data))
                .catch(() => setConversations([]))
        }

        load()
        const timer = setInterval(load, REFRESH_EVERY)
        return () => clearInterval(timer)
    }, [refreshKey, username])

    return (
        <div className='min-h-screen bg-[#0f172a]'>
            <div className='mx-auto max-w-6xl px-4 py-8'>
                <h1 className='mb-6 flex items-center gap-3 text-3xl font-bold text-white'>
                    <span className='h-8 w-1 rounded-full bg-red-600' />
                    Messages
                </h1>

                {/* The box with both panels. h-[70vh] = 70% of the
                    window's height, so each panel can scroll inside. */}
                <div className='grid h-[70vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 md:grid-cols-[20rem_1fr]'>

                    {/* LEFT - hidden on phones while a chat is open. */}
                    <div className={`border-r border-slate-800 ${username ? 'hidden md:block' : 'block'}`}>
                        <ConversationList conversations={conversations} activeUsername={username} />
                    </div>

                    {/* RIGHT - hidden on phones while no chat is open. */}
                    <div className={username ? 'block min-h-0' : 'hidden md:block'}>
                        {username ? (
                            // key={username}: a NEW ChatWindow for every
                            // person - so the typed text and the old
                            // messages don't carry over to the next chat.
                            <ChatWindow key={username} username={username} onSent={() => setRefreshKey(refreshKey + 1)} />
                        ) : (
                            <div className='flex h-full items-center justify-center p-6 text-center text-sm text-gray-500'>
                                Pick a conversation, or start a new one on the left.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MessagesPage
