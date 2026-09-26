import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Brain } from 'lucide-react'
import PageLayout from '../PageLayout/PageLayout'
import { GUIDE_GROUPS, GUIDE_TOPICS } from './guideTopics'


// ---------------------------------------------------------------
// SITE GUIDE (/guide) - anyone can read it.
//
// "How does this site work?" - every topic from guideTopics.js,
// grouped into sections (Getting started, Reading, Writing...).
//
//   [ jump-to links ]
//   GETTING STARTED
//     [card] [card]
//   READING
//     [card] [card]
//   ...
//   [ Still stuck? Ask The Watcher -> ]
//
// This file has NO text about the site itself - it only draws what's
// in guideTopics.js. Ask The Watcher reads the same list.
// ---------------------------------------------------------------


// ---------------------------------------------------------------
// One topic as a card: icon, title, summary, numbered steps, link.
//
// Usage:
//   <GuideCard topic={GUIDE_TOPICS[0]} />
// ---------------------------------------------------------------
function GuideCard({ topic }) {
    // Capital letter, so JSX treats it as a component: <Icon />
    const Icon = topic.icon

    return (
        // id={topic.id}: the Watcher links to /guide#save, and the
        // browser scrolls straight to the card with id="save".
        // scroll-mt-6 = stop a little above it, not glued to the edge.
        // flex-col + mt-auto on the link (below) = the link always sits
        // at the BOTTOM of the card, even when cards differ in height.
        <article id={topic.id} className='flex scroll-mt-6 flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
            <div className='flex items-center gap-3'>
                {/* The icon in a small red-tinted square. */}
                <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-950/60 text-red-400'>
                    <Icon className='h-5 w-5' />
                </span>
                <h3 className='text-lg font-bold text-white'>{topic.title}</h3>
            </div>

            <p className='mt-3 text-sm text-gray-400'>{topic.summary}</p>

            {/* <ol> = a NUMBERED list. We draw our own numbers (the red
                circles), so the browser's are switched off (list-none). */}
            <ol className='mt-4 list-none space-y-2.5'>
                {topic.steps.map((step, index) => (
                    <li key={index} className='flex gap-3 text-sm text-gray-300'>
                        <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-800 text-[11px] font-bold text-red-400'>
                            {/* index starts at 0, people count from 1. */}
                            {index + 1}
                        </span>
                        {step}
                    </li>
                ))}
            </ol>

            {topic.link && (
                <Link
                    to={topic.link.to}
                    className='mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold text-red-400 hover:text-red-300'
                >
                    {topic.link.label}
                    <ArrowRight className='h-4 w-4' />
                </Link>
            )}
        </article>
    )
}


function SiteGuide() {
    // location.hash = the "#save" part of the URL ('' if none).
    const location = useLocation()

    // When you ARRIVE from another page (e.g. the Watcher's "Read it
    // in the guide" link to /guide#save), React Router changes the page
    // without a reload - and the browser's own "jump to #save" doesn't
    // happen. So we do it ourselves, every time the hash changes.
    useEffect(() => {
        if (!location.hash) return

        // '#save' -> 'save' (.slice(1) drops the first character).
        const card = document.getElementById(location.hash.slice(1))
        card?.scrollIntoView({ behavior: 'smooth' })
    }, [location.hash])

    return (
        <PageLayout title='Site Guide' subtitle='Everything you can do on Silent Evidence, step by step.'>

            {/* ---------- JUMP-TO LINKS ---------- */}
            {/* Plain <a href='#reading'> links: the browser scrolls to
                the element with that id. No JavaScript needed. */}
            <nav aria-label='Guide sections' className='flex flex-wrap gap-2'>
                {GUIDE_GROUPS.map(group => (
                    <a
                        key={group.id}
                        href={`#${group.id}`}
                        className='rounded-full border border-slate-700 px-4 py-1.5 text-sm text-gray-400 transition-colors hover:border-red-700 hover:text-white'
                    >
                        {group.title}
                    </a>
                ))}
            </nav>

            {/* ---------- ONE SECTION PER GROUP ---------- */}
            <div className='mt-12 space-y-14'>
                {GUIDE_GROUPS.map(group => {
                    // The topics that belong in this section.
                    const topics = GUIDE_TOPICS.filter(topic => topic.group === group.id)

                    return (
                        <section key={group.id} id={group.id} className='scroll-mt-6'>
                            <h2 className='mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500'>
                                {group.title}
                            </h2>
                            <div className='grid gap-5 md:grid-cols-2'>
                                {topics.map(topic => (
                                    <GuideCard key={topic.id} topic={topic} />
                                ))}
                            </div>
                        </section>
                    )
                })}
            </div>

            {/* ---------- STILL STUCK? ---------- */}
            <div className='mt-16 flex flex-col items-center gap-4 rounded-2xl border border-red-900/60 bg-red-950/20 p-8 text-center sm:flex-row sm:text-left'>
                <Brain className='h-10 w-10 shrink-0 text-red-400' />
                <div className='flex-1'>
                    <p className='font-bold text-white'>Still stuck?</p>
                    <p className='text-sm text-gray-400'>Ask The Watcher. It sees everything that happens here.</p>
                </div>
                <Link
                    to='/watcher'
                    className='rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700'
                >
                    Ask The Watcher
                </Link>
            </div>
        </PageLayout>
    )
}

export default SiteGuide
