import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Brain, X, ArrowRight } from 'lucide-react'
import { findTopic } from './guideTopics'
import styles from './AskTheWatcher.module.css'


// ---------------------------------------------------------------
// ASK THE WATCHER - a small pop-up chat in the bottom-right corner,
// the same size and style as the Site Guide tour (SiteTour.jsx):
//
//   ╭──────────────────────────────────╮
//   │ Ask The Watcher                × │
//   │ ● Listening                      │
//   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  <- red bar (moves while it thinks)
//   │ (🧠)  ╭─────────────────────────╮ │
//   │       │ Saving stories          │ │  <- red title, like a tour step
//   │       │ The shadows whisper...  │ │
//   │       ╰─────────────────────────╯ │
//   │ [ Ask how something works… ][→]  │
//   │            Start over            │
//   ╰──────────────────────────────────╯
//
// Usage (Header decides WHEN it's open):
//   {watcherOpen && <AskTheWatcher onClose={() => setWatcherOpen(false)} />}
// Anywhere else on the site: call openWatcher() (see openWatcher.js).
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
//
// Keys: Esc closes it.
// ---------------------------------------------------------------


// Buttons shown under the greeting - questions we know it answers well.
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

// What the Watcher says first, when it opens.
// `title` = the bold red line at the top of a bubble (like a tour step).
const GREETING = {
    from: 'watcher',
    title: 'The Watcher',
    text: 'I see everything that happens on Silent Evidence. Ask me how anything works...',
}

// How long the Watcher "types" before answering, in milliseconds.
// A small pause makes it feel like it's thinking.
const THINKING_TIME = 900


// Math.random() gives 0 to 0.999...; times the list length and
// Math.floor() turns it into a whole index: 0, 1, 2 or 3.
function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)]
}


// The Watcher's round red "face" - the same style as the skull in
// the Site Guide tour.
function WatcherIcon() {
    return (
        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-red-900 bg-red-800'>
            <Brain className='h-5 w-5 text-slate-950' />
        </span>
    )
}


// ---------------------------------------------------------------
// One chat bubble.
//
// message = { from: 'you' | 'watcher', title?, text, topic? }
// When a Watcher message has a `topic`, the bubble also shows its
// steps and links.
// ---------------------------------------------------------------
function ChatBubble({ message }) {
    // Your questions: a small red bubble on the right.
    if (message.from === 'you') {
        return (
            <div className={`${styles.bubbleYou} flex justify-end`}>
                <p className='max-w-[85%] whitespace-pre-wrap rounded-xl rounded-br-sm bg-red-700 px-3.5 py-2 text-sm text-white'>
                    {message.text}
                </p>
            </div>
        )
    }

    // The Watcher's answers: icon + speech bubble, like the tour.
    return (
        <div className='flex gap-3'>
            <WatcherIcon />

            <div className={`${styles.bubble} min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5`}>
                {message.title && <p className='text-sm font-bold text-red-400'>{message.title}</p>}
                <p className='mt-0.5 whitespace-pre-wrap text-sm leading-6 text-gray-200'>{message.text}</p>

                {/* The topic's steps and links, when it found one. */}
                {message.topic && (
                    <>
                        <ol className='mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-gray-300'>
                            {message.topic.steps.map((step, index) => (
                                <li key={index}>{step}</li>
                            ))}
                        </ol>

                        <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-1'>
                            {message.topic.link && (
                                <Link
                                    to={message.topic.link.to}
                                    className='inline-flex items-center gap-1.5 text-sm font-semibold text-red-400 hover:text-red-300'
                                >
                                    {message.topic.link.label}
                                    <ArrowRight className='h-4 w-4' />
                                </Link>
                            )}
                            {/* /guide#save -> the Site Guide, scrolled to
                                that topic's card (see SiteGuide.jsx). */}
                            <Link to={`/guide#${message.topic.id}`} className='text-sm text-gray-400 hover:text-white'>
                                Read it in the guide
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}


function AskTheWatcher({ onClose }) {
    // The whole conversation, oldest first.
    const [messages, setMessages] = useState([GREETING])
    const [text, setText] = useState('')

    // True while the Watcher is "typing" (shows the dots).
    const [thinking, setThinking] = useState(false)

    // The scrolling box with the messages (to scroll it to the bottom),
    // the question box (to put the cursor in it when it opens), and the
    // waiting timer (to cancel it if the pop-up closes).
    const listRef = useRef(null)
    const inputRef = useRef(null)
    const timerRef = useRef(null)

    // After every new message (or the dots appearing), scroll the
    // chat box to the bottom - only the box, not the whole window.
    useEffect(() => {
        const list = listRef.current
        if (list) list.scrollTop = list.scrollHeight
    }, [messages, thinking])

    // When it opens: put the cursor in the question box.
    // When it closes: cancel a pending answer, so it doesn't try to
    // update a pop-up that's gone.
    useEffect(() => {
        inputRef.current?.focus()
        return () => clearTimeout(timerRef.current)
    }, [])

    // Esc closes it (same as the tour). onClose comes from Header.
    useEffect(() => {
        function handleKey(event) {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [onClose])

    // Work out the Watcher's reply to a question.
    function makeReply(question) {
        const topic = findTopic(question)

        if (topic) {
            return {
                from: 'watcher',
                title: topic.title,
                text: `${randomFrom(OPENINGS)}\n\n${topic.summary}`,
                topic,
            }
        }

        return {
            from: 'watcher',
            title: 'Unseen...',
            text: 'Even I cannot see the answer to that... Ask me about writing, reading, saving, following, messages, settings or privacy.',
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
        inputRef.current?.focus()
    }

    // Nothing asked yet? Then show the suggestion buttons, and no
    // "Start over" (there's nothing to clear).
    const hasChatted = messages.length > 1

    return (
        // ---------- THE CARD ----------
        // Exactly the tour's card: stuck to the bottom-right corner,
        // full width on phones (left-4 right-4), 26rem wide from sm up.
        <div
            role='dialog'
            aria-label='Ask The Watcher'
            className={`${styles.card} fixed bottom-[calc(var(--tabbar-space)+1rem)] left-4 right-4 z-50 overflow-hidden rounded-2xl border border-red-900/70 bg-slate-900 shadow-2xl shadow-black/60 sm:left-auto sm:w-[26rem]`}
        >
            {/* ---------- TOP: title, status, close ---------- */}
            <div className='flex items-start justify-between bg-slate-800/60 px-5 pb-3 pt-4'>
                <div>
                    <p className='font-bold text-red-400'>Ask The Watcher</p>
                    {/* aria-live: screen readers hear when it starts/stops thinking. */}
                    <p className='flex items-center gap-2 text-sm text-gray-400' aria-live='polite'>
                        <span className={`h-2 w-2 rounded-full ${thinking ? 'animate-pulse bg-red-500' : 'bg-green-500'}`} />
                        {thinking ? 'Thinking...' : 'Listening'}
                    </p>
                </div>
                <button type='button' onClick={onClose} aria-label='Close The Watcher' className='p-1 text-gray-500 hover:text-white'>
                    <X className='h-5 w-5' />
                </button>
            </div>

            {/* ---------- RED BAR ---------- */}
            {/* Like the tour's progress bar. While the Watcher thinks,
                a red streak runs across it. */}
            <div className='relative h-1 overflow-hidden bg-red-950'>
                <div className={thinking ? styles.scan : 'h-full w-full bg-red-600'} />
            </div>

            {/* ---------- THE MESSAGES ---------- */}
            {/* max-h: never taller than 20rem, or half the window on
                small screens - so the card never covers the whole page.
                aria-live='polite' makes screen readers read new answers. */}
            <div ref={listRef} aria-live='polite' className='max-h-[min(20rem,50vh)] space-y-4 overflow-y-auto px-5 py-4'>
                {messages.map((message, index) => (
                    // key={index} is OK here: messages are only ever
                    // ADDED at the end ("Start over" replaces them all).
                    <ChatBubble key={index} message={message} />
                ))}

                {/* Suggestions, until the first question is asked. */}
                {!hasChatted && (
                    <div className='flex flex-wrap gap-1.5 pl-12'>
                        {SUGGESTED_QUESTIONS.map(question => (
                            <button
                                key={question}
                                type='button'
                                onClick={() => ask(question)}
                                className='rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-red-700 hover:text-white'
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                )}

                {/* The "typing" dots while it thinks. */}
                {thinking && (
                    <div className='flex items-center gap-3'>
                        <WatcherIcon />
                        <span className={styles.dots} aria-label='The Watcher is typing'>
                            <span />
                            <span />
                            <span />
                        </span>
                    </div>
                )}
            </div>

            {/* ---------- BOTTOM: the question box ---------- */}
            <form onSubmit={handleSubmit} className='flex items-center gap-2 border-t border-slate-800 px-5 py-3'>
                <input
                    ref={inputRef}
                    value={text}
                    onChange={event => setText(event.target.value)}
                    placeholder='Ask how something works...'
                    aria-label='Your question'
                    maxLength={200}
                    className='min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-600 focus:outline-none'
                />
                <button
                    type='submit'
                    disabled={thinking || !text.trim()}
                    aria-label='Ask'
                    className='flex shrink-0 items-center rounded-lg bg-red-700 p-2.5 text-white transition-colors hover:bg-red-600 disabled:opacity-50'
                >
                    <ArrowRight className='h-4 w-4' />
                </button>
            </form>

            {/* ---------- START OVER ---------- */}
            {/* A quiet link, like "Skip tutorial" on the tour. */}
            {hasChatted && (
                <button type='button' onClick={reset} className='mb-3 block w-full text-center text-sm text-gray-500 hover:text-gray-300'>
                    Start over
                </button>
            )}
        </div>
    )
}

export default AskTheWatcher
