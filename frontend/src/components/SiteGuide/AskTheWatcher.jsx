import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Send, RotateCcw, ArrowRight } from 'lucide-react'
import { findTopic } from './guideTopics'
import styles from './AskTheWatcher.module.css'


// ---------------------------------------------------------------
// ASK THE WATCHER (/watcher) - anyone can use it.
//
// A chat with "The Watcher", the site's spooky helper. You ask how
// something works, it answers.
//
// How it "thinks" (no AI, no server - it all runs in the browser):
//   1. findTopic() in guideTopics.js picks the topic whose keywords
//      best match your question.
//   2. The Watcher answers with that topic's summary + steps + link.
//   3. No match -> it says so and suggests questions it CAN answer.
//
// The answers come from the same list as the Site Guide, so both
// always agree. To teach the Watcher something new, add a topic (or
// keywords) in guideTopics.js.
// ---------------------------------------------------------------


// The buttons under the chat - questions we know it answers well.
const SUGGESTED_QUESTIONS = [
    'How do I write a story?',
    'How do I save a story for later?',
    'How do I make my profile private?',
    'How does the leaderboard work?',
    'Can I write together with a friend?',
]

// A spooky first line, picked at random, so answers don't all start
// the same way.
const OPENINGS = [
    'I have watched many ask this before you...',
    'Ah. I know this one well.',
    'The shadows whisper the answer...',
    'I see what you seek.',
]

// What the Watcher says first, when the page opens.
const GREETING = {
    from: 'watcher',
    text: 'I am The Watcher. I see everything that happens on Silent Evidence. Ask me how anything works...',
}

// How long the Watcher "types" before answering, in milliseconds.
// A small pause makes it feel like it's thinking.
const THINKING_TIME = 900


// Math.random() gives 0 to 0.999...; times the list length and
// Math.floor() turns it into a whole index: 0, 1, 2 or 3.
function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)]
}


// ---------------------------------------------------------------
// One chat bubble.
//
// message = { from: 'you' | 'watcher', text, topic? }
// When a Watcher message has a `topic`, the bubble also shows its
// steps and links.
// ---------------------------------------------------------------
function ChatBubble({ message }) {
    const isYou = message.from === 'you'

    return (
        <div className={`flex gap-3 ${isYou ? 'justify-end' : 'justify-start'}`}>
            {/* The Watcher's little icon on the left of its bubbles. */}
            {!isYou && (
                <span className='mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-800 bg-red-950/60'>
                    <Brain className='h-4 w-4 text-red-400' />
                </span>
            )}

            <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:max-w-[75%] ${
                    isYou
                        ? 'rounded-br-sm bg-red-600 text-white'
                        : 'rounded-bl-sm border border-slate-800 bg-slate-900 text-gray-200'
                }`}
            >
                <p className='whitespace-pre-wrap'>{message.text}</p>

                {/* The topic's steps and links, when it found one. */}
                {message.topic && (
                    <>
                        <ol className='mt-3 list-decimal space-y-1.5 pl-5 text-gray-300'>
                            {message.topic.steps.map((step, index) => (
                                <li key={index}>{step}</li>
                            ))}
                        </ol>

                        <div className='mt-4 flex flex-wrap gap-2'>
                            {message.topic.link && (
                                <Link
                                    to={message.topic.link.to}
                                    className='flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700'
                                >
                                    {message.topic.link.label}
                                    <ArrowRight className='h-3.5 w-3.5' />
                                </Link>
                            )}
                            {/* /guide#save -> the Site Guide, scrolled to
                                that topic's card (see SiteGuide.jsx). */}
                            <Link
                                to={`/guide#${message.topic.id}`}
                                className='rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-gray-300 hover:border-slate-500 hover:text-white'
                            >
                                Read it in the guide
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}


function AskTheWatcher() {
    // The whole conversation, oldest first.
    const [messages, setMessages] = useState([GREETING])
    const [text, setText] = useState('')

    // True while the Watcher is "typing" (shows the dots).
    const [thinking, setThinking] = useState(false)

    // The scrolling box with the messages (to scroll it to the bottom),
    // and the waiting timer (to cancel it if you leave the page).
    const listRef = useRef(null)
    const timerRef = useRef(null)

    // After every new message (or the dots appearing), scroll the
    // chat box to the bottom. Same trick as on the Messages page:
    // move only the box, not the whole window.
    useEffect(() => {
        const list = listRef.current
        if (list) list.scrollTop = list.scrollHeight
    }, [messages, thinking])

    // Leaving the page while the Watcher is "typing"? Cancel the timer,
    // so it doesn't try to update a page that's gone.
    useEffect(() => {
        return () => clearTimeout(timerRef.current)
    }, [])

    // Work out the Watcher's reply to a question.
    function makeReply(question) {
        const topic = findTopic(question)

        if (topic) {
            return {
                from: 'watcher',
                text: `${randomFrom(OPENINGS)}\n\n${topic.title}: ${topic.summary}`,
                topic,
            }
        }

        return {
            from: 'watcher',
            text: 'Even I cannot see the answer to that... Ask me about writing, reading, saving, following, messages, settings or privacy. Or try one of the questions below.',
        }
    }

    // Send a question - from the input OR from a suggestion button.
    function ask(question) {
        const clean = question.trim()
        // Ignore empty questions, and new ones while it's still typing.
        if (!clean || thinking) return

        // 1. Your message appears straight away.
        // The function form (current => ...) always works with the
        // LATEST list, even if React hasn't re-rendered yet.
        setMessages(current => [...current, { from: 'you', text: clean }])
        setText('')
        setThinking(true)

        // 2. A moment later, the Watcher answers.
        // setTimeout = "run this once, after X milliseconds".
        timerRef.current = setTimeout(() => {
            setMessages(current => [...current, makeReply(clean)])
            setThinking(false)
        }, THINKING_TIME)
    }

    function handleSubmit(event) {
        event.preventDefault()
        ask(text)
    }

    // "Start over": back to just the greeting.
    function reset() {
        clearTimeout(timerRef.current)
        setMessages([GREETING])
        setThinking(false)
    }

    return (
        <div className='min-h-screen bg-[#0f172a]'>
            <div className='mx-auto max-w-3xl px-4 py-12'>

                {/* ---------- TOP: the Watcher's "portrait" ---------- */}
                <div className='text-center'>
                    {/* styles.eye = the slow red glow (AskTheWatcher.module.css). */}
                    <div className={`${styles.eye} mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-800 bg-[#020617]`}>
                        <Brain className='h-9 w-9 text-red-500' />
                    </div>
                    <h1 className='mt-5 text-3xl font-bold text-white'>Ask The Watcher</h1>
                    <p className='mt-2 text-sm text-gray-400'>Questions about the site? It has seen it all.</p>
                </div>

                {/* ---------- THE CHAT ---------- */}
                <div className='mt-10 overflow-hidden rounded-2xl border border-slate-800 bg-[#020617]'>
                    {/* The top bar with "Start over". */}
                    <div className='flex items-center justify-between border-b border-slate-800 px-4 py-3'>
                        <p className='flex items-center gap-2 text-sm text-gray-400'>
                            {/* A small green dot = "online". animate-pulse
                                makes it fade in and out. */}
                            <span className='h-2 w-2 animate-pulse rounded-full bg-green-500' />
                            The Watcher is listening
                        </p>
                        <button type='button' onClick={reset} className='flex items-center gap-1.5 text-xs text-gray-500 hover:text-white'>
                            <RotateCcw className='h-3.5 w-3.5' />
                            Start over
                        </button>
                    </div>

                    {/* The messages. h-[28rem] + overflow-y-auto = a fixed
                        height that scrolls inside. aria-live='polite' makes
                        screen readers read new answers out loud. */}
                    <div ref={listRef} aria-live='polite' className='h-[28rem] space-y-4 overflow-y-auto p-4'>
                        {messages.map((message, index) => (
                            // key={index} is OK here: messages are only
                            // ever ADDED at the end, never moved or removed
                            // one by one ("Start over" replaces them all).
                            <ChatBubble key={index} message={message} />
                        ))}

                        {/* The "typing" dots while it thinks. */}
                        {thinking && (
                            <div className='flex items-center gap-3'>
                                <span className='flex h-8 w-8 items-center justify-center rounded-full border border-red-800 bg-red-950/60'>
                                    <Brain className='h-4 w-4 text-red-400' />
                                </span>
                                <span className={styles.dots} aria-label='The Watcher is typing'>
                                    <span />
                                    <span />
                                    <span />
                                </span>
                            </div>
                        )}
                    </div>

                    {/* The question box. */}
                    <form onSubmit={handleSubmit} className='flex gap-2 border-t border-slate-800 p-3'>
                        <input
                            value={text}
                            onChange={event => setText(event.target.value)}
                            placeholder='Ask how something works...'
                            aria-label='Your question'
                            maxLength={200}
                            className='min-w-0 flex-1 rounded-full border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-600 focus:outline-none'
                        />
                        <button
                            type='submit'
                            disabled={thinking || !text.trim()}
                            aria-label='Ask'
                            className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700 disabled:opacity-50'
                        >
                            <Send className='h-4 w-4' />
                        </button>
                    </form>
                </div>

                {/* ---------- SUGGESTED QUESTIONS ---------- */}
                <div className='mt-6'>
                    <p className='mb-3 text-xs uppercase tracking-[0.25em] text-gray-500'>Try asking</p>
                    <div className='flex flex-wrap gap-2'>
                        {SUGGESTED_QUESTIONS.map(question => (
                            <button
                                key={question}
                                type='button'
                                onClick={() => ask(question)}
                                disabled={thinking}
                                className='rounded-full border border-slate-700 px-4 py-1.5 text-sm text-gray-400 transition-colors hover:border-red-700 hover:text-white disabled:opacity-50'
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                </div>

                <p className='mt-10 text-center text-sm text-gray-500'>
                    Prefer to read? Everything is in the{' '}
                    <Link to='/guide' className='text-red-400 hover:text-red-300'>Site Guide</Link>.
                </p>
            </div>
        </div>
    )
}

export default AskTheWatcher
