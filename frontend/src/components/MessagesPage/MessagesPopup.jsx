import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Send, SquarePen, X, MessageCircleMore } from 'lucide-react'
import { getConversations, getConversation, sendMessage } from '../../api/client'
import Avatar from '../Avatar/Avatar'


// ---------------------------------------------------------------
// MESSAGES - a POP-UP chat window, like Messenger on Facebook.
//
//   big screens:  a floating window in the bottom-right corner;
//                 the page behind stays usable
//   phones:       a sheet that slides up over the page, with a dark
//                 layer behind it
//
//   ╭──────────────────────────────╮      ╭──────────────────────────────╮
//   │ Messages                  ✕ │      │ ← (MO) moth                ✕ │
//   │ ( New message to...    ✎ ) │      │                              │
//   │ (MO) moth          21:05    │  ->  │  Did you hear that?          │
//   │      Did you hear that?  1  │      │             Hear what? ▌     │
//   │ (RA) raven         Mon      │      │                              │
//   ╰──────────────────────────────╯      │ ( Message moth...       ➤ ) │
//         the list                        ╰──────────────────────────────╯
//                                               one chat
//
// It lives in Header.jsx and is opened from anywhere with
// openMessages() (openMessages.js). The old /messages addresses still
// work - they open this pop-up (MessagesRoute.jsx).
//
// Props:
//   startWith = '' for the list, or a username to open that chat
//   onClose   = called by the ✕ (and the dark layer on phones)
//
// New messages don't arrive by themselves (that needs WebSockets,
// a whole topic of its own). Instead we simply ask Django again
// every few seconds - "polling". Simple, and fine for a small site.
//
// Django: backend/messaging/views.py.
// ---------------------------------------------------------------

// How often to check for new messages, in milliseconds.
const REFRESH_EVERY = 5000   // 5 seconds

// The round icon buttons in the window's top bar (back, close).
const ROUND_BUTTON = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white'


// "2026-09-26T21:05:00Z" -> "21:05" today, "26 Sep" on other days.
function shortTime(isoString) {
    const date = new Date(isoString)
    const isToday = date.toDateString() === new Date().toDateString()
    return isToday
        ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}


// The ✕ in the top right corner of both screens.
function CloseButton({ onClose }) {
    return (
        <button type='button' onClick={onClose} aria-label='Close messages' className={ROUND_BUTTON}>
            <X className='h-5 w-5' />
        </button>
    )
}


// ---------------------------------------------------------------
// SCREEN 1: the list of conversations.
//
// Props:
//   onOpen(username) - open a chat (a new one, or from the list)
//   onClose          - close the whole pop-up
// ---------------------------------------------------------------
function ConversationList({ onOpen, onClose }) {
    const [conversations, setConversations] = useState(null)
    const [newName, setNewName] = useState('')

    // Load the list, and again every 5 seconds (new messages from
    // others). The cleanup stops the timer when the list closes.
    useEffect(() => {
        function load() {
            getConversations()
                .then(data => setConversations(data))
                .catch(() => setConversations([]))
        }

        load()
        const timer = setInterval(load, REFRESH_EVERY)
        return () => clearInterval(timer)
    }, [])

    // "New message": type a username, open the chat with them.
    function startConversation(event) {
        event.preventDefault()
        if (newName.trim()) onOpen(newName.trim())
    }

    return (
        <div className='flex h-full flex-col'>
            {/* ---------- TOP BAR ---------- */}
            <div className='flex items-center gap-2 px-4 pt-4 pb-2'>
                <h2 className='mr-auto text-xl font-bold text-white'>Messages</h2>
                <CloseButton onClose={onClose} />
            </div>

            {/* ---------- NEW MESSAGE ---------- */}
            {/* A rounded field like the search bar (SearchBox.jsx). */}
            <form onSubmit={startConversation} className='px-4 pb-3'>
                <div className='flex items-center gap-2 rounded-full bg-slate-800 py-1.5 pl-4 pr-1.5 ring-1 ring-white/5 focus-within:ring-2 focus-within:ring-red-600/70'>
                    <input
                        value={newName}
                        onChange={event => setNewName(event.target.value)}
                        placeholder='New message to...'
                        aria-label='Username to message'
                        className='min-w-0 flex-1 bg-transparent py-1 text-sm text-white placeholder:text-gray-500 focus:outline-none'
                    />
                    <button
                        type='submit'
                        aria-label='Start conversation'
                        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 active:scale-95'
                    >
                        <SquarePen className='h-4 w-4' />
                    </button>
                </div>
            </form>

            {/* ---------- THE LIST ---------- */}
            {/* min-h-0 + flex-1 + overflow-y-auto = this part takes the
                space that's left and scrolls by itself. */}
            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2'>
                {conversations === null && <p className='p-4 text-sm text-gray-500'>Loading...</p>}

                {conversations?.length === 0 && (
                    <div className='flex flex-col items-center px-6 py-12 text-center'>
                        <span className='flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-gray-500'>
                            <MessageCircleMore className='h-6 w-6' />
                        </span>
                        <p className='mt-4 font-semibold text-gray-200'>No messages yet</p>
                        <p className='mt-1 text-sm text-gray-500'>Type a username above to start a chat.</p>
                    </div>
                )}

                <ul className='space-y-0.5'>
                    {conversations?.map(conversation => (
                        <li key={conversation.username}>
                            <button
                                type='button'
                                onClick={() => onOpen(conversation.username)}
                                // Unread chats get a faint red tint, like
                                // unread notifications (NotificationItem.jsx).
                                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${
                                    conversation.unread > 0 ? 'bg-red-600/[0.07]' : ''
                                }`}
                            >
                                <Avatar username={conversation.username} image={conversation.avatar} />

                                <span className='min-w-0 flex-1'>
                                    <span className='flex items-center justify-between gap-2'>
                                        <span className='truncate text-sm font-semibold text-white'>{conversation.username}</span>
                                        <span className={`shrink-0 text-[11px] ${conversation.unread > 0 ? 'font-semibold text-red-400' : 'text-gray-500'}`}>
                                            {shortTime(conversation.last_message.created_at)}
                                        </span>
                                    </span>
                                    <span className='flex items-center justify-between gap-2'>
                                        {/* Unread = brighter text, so you notice it. */}
                                        <span className={`truncate text-xs ${conversation.unread > 0 ? 'font-medium text-gray-100' : 'text-gray-500'}`}>
                                            {conversation.last_message.is_mine && 'You: '}
                                            {conversation.last_message.body}
                                        </span>
                                        {conversation.unread > 0 && (
                                            <span className='flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white'>
                                                {conversation.unread}
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}


// ---------------------------------------------------------------
// SCREEN 2: one conversation.
//
// Props:
//   username - who we're talking to
//   onBack   - back to the list
//   onClose  - close the whole pop-up
// ---------------------------------------------------------------
function ChatWindow({ username, onBack, onClose }) {
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

        // Cleanup when you open another chat or close the pop-up:
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
        } catch (err) {
            setError(err.data?.detail || 'Could not send. Try again.')
        } finally {
            setSending(false)
        }
    }

    // The top bar: ← back, who it is, ✕. While loading (or if the
    // user doesn't exist) we only know the name from the props.
    const name = chat && chat !== 'not-found' ? chat.username : username
    const topBar = (
        <div className='flex items-center gap-2 border-b border-white/5 px-2 py-2.5'>
            <button type='button' onClick={onBack} aria-label='Back to conversations' className={ROUND_BUTTON}>
                <ArrowLeft className='h-5 w-5' />
            </button>
            {chat && chat !== 'not-found' && <Avatar username={chat.username} image={chat.avatar} />}
            {/* The name links to their profile. min-w-0 + truncate:
                a long name ends in "..." instead of pushing the ✕ out. */}
            <Link to={`/profile/${name}`} onClick={onClose} className='min-w-0 flex-1 truncate font-semibold text-white hover:text-red-400'>
                {name}
            </Link>
            <CloseButton onClose={onClose} />
        </div>
    )

    if (chat === null || chat === 'not-found') {
        return (
            <div className='flex h-full flex-col'>
                {topBar}
                <p className='p-6 text-sm text-gray-400'>
                    {chat === null ? 'Loading conversation...' : `There's nobody called "${username}".`}
                </p>
            </div>
        )
    }

    return (
        <div className='flex h-full flex-col'>
            {topBar}

            {/* ---------- THE MESSAGES ---------- */}
            {/* ref={listRef}: this is the box we scroll (see above).
                min-h-0 lets it shrink inside the flex column, so it
                scrolls instead of growing taller than the window. */}
            <div ref={listRef} className='min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-4'>
                {chat.messages.length === 0 && (
                    <p className='py-10 text-center text-sm text-gray-500'>No messages yet. Say hello!</p>
                )}

                {chat.messages.map(message => (
                    // Mine on the right (justify-end), theirs on the left.
                    <div key={message.id} className={`flex ${message.is_mine ? 'justify-end' : 'justify-start'}`}>
                        {/* max-w-[80%]: a bubble never fills the whole width.
                            whitespace-pre-wrap keeps the line breaks you typed.
                            break-words: a very long word wraps instead of
                            sticking out of the bubble. */}
                        <div
                            className={`max-w-[80%] whitespace-pre-wrap break-words rounded-3xl px-4 py-2 text-sm ${
                                message.is_mine
                                    ? 'rounded-br-md bg-red-600 text-white'
                                    : 'rounded-bl-md bg-slate-800 text-gray-100'
                            }`}
                        >
                            {message.body}
                            <p className={`mt-0.5 text-right text-[10px] ${message.is_mine ? 'text-red-200' : 'text-gray-500'}`}>
                                {shortTime(message.created_at)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ---------- WRITE A MESSAGE ---------- */}
            {chat.blocked ? (
                <p className='border-t border-white/5 p-4 text-center text-sm text-gray-500'>
                    You can't message this user.
                </p>
            ) : (
                // pb-[...env(...)]: on an iPhone the box stays above the
                // swipe bar at the very bottom.
                <form onSubmit={handleSend} className='border-t border-white/5 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3'>
                    {/* A rounded field with the send button inside it. */}
                    <div className='flex items-center gap-2 rounded-full bg-slate-800 py-1.5 pl-4 pr-1.5 ring-1 ring-white/5 focus-within:ring-2 focus-within:ring-red-600/70'>
                        <input
                            value={text}
                            onChange={event => setText(event.target.value)}
                            placeholder={`Message ${chat.username}...`}
                            aria-label='Your message'
                            maxLength={2000}
                            className='min-w-0 flex-1 bg-transparent py-1 text-sm text-white placeholder:text-gray-500 focus:outline-none'
                        />
                        <button
                            type='submit'
                            disabled={sending || !text.trim()}
                            aria-label='Send'
                            className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-40'
                        >
                            <Send className='h-4 w-4' />
                        </button>
                    </div>
                    {error && <p className='mt-2 px-2 text-xs text-red-400'>{error}</p>}
                </form>
            )}
        </div>
    )
}


// ---------------------------------------------------------------
// THE POP-UP: the window around the two screens.
// ---------------------------------------------------------------
function MessagesPopup({ startWith = '', onClose }) {
    // Which screen: '' = the list, a username = that chat.
    const [openChat, setOpenChat] = useState(startWith)

    // While it's open: Escape closes it (big screens have Esc).
    useEffect(() => {
        function handleKey(event) {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [onClose])

    return (
        <>
            {/* PHONES: a dark layer over the page behind the sheet.
                Tapping it closes the pop-up. sm:hidden = phones only -
                on big screens the page behind stays usable, like a
                Messenger window. aria-hidden: just decoration. */}
            <div onClick={onClose} aria-hidden='true' className='fixed inset-0 z-[60] bg-black/60 sm:hidden' />

            {/* role='dialog' + aria-label tell screen readers what this is.
                PHONES: a sheet from the bottom, almost full height
                (top-[...] leaves a strip of the page showing at the top),
                round top corners.
                FROM "sm" UP: a floating window in the bottom-right
                corner - 24rem wide, at most 36rem tall (or the window
                height minus a gap), round on all corners. */}
            <div
                role='dialog'
                aria-label='Messages'
                className='fixed inset-x-0 bottom-0 top-[calc(3rem+env(safe-area-inset-top))] z-[60] flex flex-col overflow-hidden rounded-t-3xl bg-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-6 sm:h-[min(36rem,calc(100dvh-6rem))] sm:w-96 sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-2xl sm:shadow-black/60'
            >
                {/* The phone sheet's "drag handle" - just a picture. */}
                <div className='flex justify-center pt-2 sm:hidden' aria-hidden='true'>
                    <span className='h-1.5 w-10 rounded-full bg-slate-700' />
                </div>

                {/* min-h-0 + flex-1: the screen inside fills the window
                    and can scroll inside it. */}
                <div className='min-h-0 flex-1'>
                    {openChat ? (
                        // key={openChat}: a NEW ChatWindow for every person,
                        // so the typed text and old messages don't carry
                        // over to the next chat.
                        <ChatWindow key={openChat} username={openChat} onBack={() => setOpenChat('')} onClose={onClose} />
                    ) : (
                        <ConversationList onOpen={setOpenChat} onClose={onClose} />
                    )}
                </div>
            </div>
        </>
    )
}

export default MessagesPopup
