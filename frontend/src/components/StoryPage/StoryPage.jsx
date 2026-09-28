import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Eye, BookOpen } from 'lucide-react'
import { getStory, getStories, mediaUrl } from '../../api/client'
import { pluralize, formatLongDate, splitParagraphs } from '../../utils/format'
import { stripFormatting } from '../../utils/storyFormat'
import Breadcrumbs from '../Breadcrumbs/Breadcrumbs'
import SectionHeading from '../StorySections/SectionHeading'
import StoryCard from '../StorySections/StoryCard'
import StoryGridCard from '../StorySections/StoryGridCard'
import NotFound from '../NotFound/NotFound'
import StoryActions from './StoryActions'
import ReadingToolbar from './ReadingToolbar'
import StoryBody from './StoryBody'
import FocusView from './FocusView'
import LikeButton from './LikeButton'
import Comments from './Comments'
import { SeriesLabel, SeriesNav } from './SeriesNav'
import styles from './StoryPage.module.css'
import { usePageTitle } from '../../hooks/usePageTitle'
import StoryLock from './StoryLock'
import FearMeter from './FearMeter'
import ReactionBar from './ReactionBar'
import { useAuth } from '../../hooks/useAuth'
import CampfireMode from './CampfireMode'


// The name the reader's text size is saved under in the browser.
const TEXT_SIZE_KEY = 'storyTextSize'


// ===============================================================
// ONE STORY  (/stories/5)
//
//   1. Cover picture
//   2. Title, author + details, Actions menu (StoryActions)
//   3. The intro (excerpt) as a quote
//   4. Reading tools: Listen, Focus, text size (ReadingToolbar)
//   5. The story (StoryBody)
//   6. "Because of what you read" - one recommendation
//   7. Like button + comments
//   8. "More from <category>"
//
// This file loads the data and arranges the pieces. Each piece is
// its own component in this folder, so it's easy to find things -
// and to reuse them on other pages.
// ===============================================================
function StoryPage() {
    // useParams() always gives STRINGS: { id: '5' }, not 5.
    const { id } = useParams()
    const { user } = useAuth()

    const [story, setStory] = useState(null)
    const [reloadKey, setReloadKey] = useState(0)
    // Browser tab: the story's title (story is null while loading).
    usePageTitle(story?.title)
    const [notFound, setNotFound] = useState(false)
    const [otherStories, setOtherStories] = useState([])

    // Focus mode on/off.
    const [focus, setFocus] = useState(false)

    // Text size, remembered between visits (same trick as the
    // grid/list choice on CategoryPage).
    const [textSize, setTextSize] = useState(() => localStorage.getItem(TEXT_SIZE_KEY) || 'normal')

    useEffect(() => {
        localStorage.setItem(TEXT_SIZE_KEY, textSize)
    }, [textSize])

    // ---------- Load the story ----------
    // Heads-up: while developing (npm run dev), each visit adds TWO
    // views, not one. <StrictMode> in main.jsx deliberately runs every
    // effect twice in development, to help you spot effects that
    // aren't cleaned up properly. The real site (npm run build) runs
    // it once, so real visitors count once.
    useEffect(() => {
        // Clicking another story further down changes the id, but
        // React Router keeps the page where it was - you'd land at the
        // bottom of the new story. Jump back to the top instead.
        window.scrollTo(0, 0)

        // Throw away late answers if the id changes again meanwhile
        // (same trick as on CategoryPage).
        let ignore = false

        getStory(id)
            .then(data => {
                if (!ignore) setStory(data)
            })
            .catch(err => {
                if (ignore) return
                if (err.status === 404) {
                    setNotFound(true)
                } else {
                    console.error('Could not load story:', err)
                }
            })

        return () => {
            ignore = true
        }
        // reloadKey: after confirming your age on the lock screen,
        // load the story again - now WITH its text.
    }, [id, reloadKey])

    // ---------- Load other stories from the same category ----------
    // ?. = optional chaining: undefined while the story is loading,
    // instead of crashing on "null.category_slug".
    const categorySlug = story?.category_slug

    useEffect(() => {
        // Not loaded yet, or the story has no category: nothing to show.
        if (!categorySlug) return

        let ignore = false

        // Ask for 5, because the story you're reading is probably one
        // of them - that still leaves 1 recommendation + 3 for the grid.
        getStories({ category: categorySlug, limit: 5 })
            .then(data => {
                if (ignore) return
                // Number(id): the id from the URL is a string ('5'), but
                // ids from the API are numbers (5), and '5' !== 5.
                setOtherStories(data.filter(s => s.id !== Number(id)))
            })
            .catch(err => console.error('Could not load more stories:', err))

        return () => {
            ignore = true
        }
    }, [categorySlug, id])


    if (notFound) {
        return <NotFound title='Story not found' message="It may have been removed, or it isn't published yet." />
    }

    if (!story) {
        return <p className='bg-gray-900 py-24 text-center text-gray-400'>Loading...</p>
    }

    // Home / Haunted Houses / The Census Taker
    // (the category crumb only if the story has a category)
    const crumbs = [{ label: 'Home', to: '/' }]
    if (story.category) {
        crumbs.push({ label: story.category, to: `/category/${story.category_slug}` })
    }
    crumbs.push({ label: story.title })

    // Listen reads the title first, then one paragraph at a time.
    // stripFormatting removes the **bold** / ## marks first, so the
    // voice doesn't read them out.
    const speechPieces = [story.title, ...splitParagraphs(stripFormatting(story.body))]

    // The first other story is the recommendation, the rest go in the
    // "More from..." grid at the bottom.
    const recommended = otherStories[0]
    const moreStories = otherStories.slice(1)

    const initials = story.author.slice(0, 2).toUpperCase()

    return (
        <article className='bg-gray-900 pb-20'>

            {/* ================= 1. COVER ================= */}
            {/* A bit wider than the text column below, like a magazine. */}
            <div className='relative mx-auto max-w-4xl'>
                {story.cover_image ? (
                    <img src={mediaUrl(story.cover_image)} alt='' className='h-64 w-full object-cover sm:h-96' />
                ) : (
                    <div className={`h-40 ${styles.noImage}`} />
                )}

                {/* Fades the bottom of the picture into the page colour. */}
                <div className='absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-gray-900 to-transparent' />
            </div>

            {/* max-w-2xl = about 70 characters per line at this text
                size - the width that's most comfortable to read. */}
            <div className='mx-auto max-w-2xl px-4'>

                {/* ================= 2. TITLE + AUTHOR ================= */}
                <div className='mt-6'>
                    <Breadcrumbs items={crumbs} />
                </div>

                {story.category && (
                    <Link
                        to={`/category/${story.category_slug}`}
                        className='mt-6 inline-block text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-400'
                    >
                        {story.category}
                    </Link>
                )}

                {/* "Part 2 of 5 · The Lighthouse Diaries" (only for series). */}
                <SeriesLabel series={story.series} />

                <h1 className='mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl'>{story.title}</h1>

                {/* Author on the left, Actions on the right. */}
                <div className='mt-5 flex items-start justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-700 text-sm font-bold text-white'>
                            {initials}
                        </span>
                        <div>
                            {/* The author (and co-authors, if anyone accepted
                                a Co-author Invite), each a link to their profile. */}
                            <p className='font-semibold text-red-400'>
                                <Link to={`/profile/${story.author}`} className='hover:text-red-300'>{story.author}</Link>
                                {/* story.coauthors = ['night_owl', ...] or [].
                                    Each one gets " & name" after the author. */}
                                {story.coauthors?.map(name => (
                                    <span key={name} className='text-gray-400'>
                                        {' & '}
                                        <Link to={`/profile/${name}`} className='text-red-400 hover:text-red-300'>{name}</Link>
                                    </span>
                                ))}
                            </p>
                            {/* flex-wrap: on a phone the details wrap onto a
                                second line instead of squashing together. */}
                            <p className='flex flex-wrap items-center gap-x-2 text-xs text-gray-500'>
                                <span>{formatLongDate(story.created_at)}</span>
                                <span>&middot;</span>
                                <span>{story.reading_time} min read</span>
                                <span>&middot;</span>
                                <span>{pluralize(story.word_count, 'word', 'words')}</span>
                                <span>&middot;</span>
                                <span className='inline-flex items-center gap-1'>
                                    <Eye className='h-3.5 w-3.5' /> {pluralize(story.views, 'view', 'views')}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* key={story.id}: a new story = a fresh menu, so the
                        "Saved" state of the previous story can't stick. */}
                    <StoryActions key={story.id} story={story} />
                </div>

                {/* ================= 3. INTRO ================= */}
                {/* <blockquote> = the HTML tag for a quote. border-l-2 is
                    the red line down the left side. */}
                {story.excerpt && (
                    <blockquote className='mt-8 border-l-2 border-red-600 pl-4 text-lg italic text-gray-400'>
                        {story.excerpt}
                    </blockquote>
                )}

                {/* ================= 4. READING TOOLS ================= */}
                {/* Not on a locked 18+ story - there's no text to read yet. */}
                {!story.lock && (
                    <div className='mt-8'>
                        <ReadingToolbar
                            speechPieces={speechPieces}
                            onFocus={() => setFocus(true)}
                            textSize={textSize}
                            onTextSizeChange={setTextSize}
                        />
                        {/* Background sound while reading (CampfireMode.jsx). */}
                        <div className='mt-3'>
                            <CampfireMode />
                        </div>
                    </div>
                )}

                {/* ================= 5. THE STORY ================= */}
                {/* An 18+ story you can't read yet: the lock screen instead
                    of the text (Django didn't send the text at all). */}
                {story.lock ? (
                    <StoryLock lock={story.lock} onUnlocked={() => setReloadKey(key => key + 1)} />
                ) : (
                    <div className='mt-8'>
                        <StoryBody body={story.body} size={textSize} />
                    </div>
                )}

                {/* Previous / next part (only for series). */}
                <SeriesNav series={story.series} />

                {/* The story's tags. Each one opens a search for it -
                    search also looks at tags (SearchView in Django). */}
                {story.tags?.length > 0 && (
                    <div className='mt-8 flex flex-wrap gap-2'>
                        {story.tags.map(tag => (
                            <Link
                                key={tag}
                                to={`/search?q=${encodeURIComponent(tag)}`}
                                className='rounded-full border border-slate-700 px-3 py-1 text-sm text-gray-300 transition-colors hover:border-red-700 hover:text-white'
                            >
                                #{tag}
                            </Link>
                        ))}
                    </div>
                )}

                {/* ================= 6. RECOMMENDATION ================= */}
                {recommended && (
                    <section className='mt-14'>
                        <p className='mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400'>
                            <BookOpen className='h-4 w-4' />
                            Because of what you read
                        </p>
                        {/* The same wide card as the homepage picks. */}
                        <StoryCard story={recommended} accent='red' />
                    </section>
                )}

                {/* ================= 7. LIKE + COMMENTS ================= */}
                <div className='mt-12 border-t border-gray-800 pt-10'>
                    {/* key = "start fresh for a new story". The two keys
                        must differ: siblings may never share a key. */}
                    {/* The fear meter - once you could read the story.
                        You can't rate your own (Django refuses too). */}
                    {!story.lock && (
                        <div className='mb-6'>
                            <FearMeter key={`fear-${story.id}`} storyId={story.id} initial={story.fear} canRate={user?.username !== story.author} />
                        </div>
                    )}

                    {/* Like + the scary reactions, side by side. */}
                    <div className='flex flex-wrap items-center gap-3'>
                        <LikeButton
                            key={`like-${story.id}`}
                            storyId={story.id}
                            initialLiked={story.liked}
                            initialCount={story.like_count}
                        />
                        <ReactionBar key={`reactions-${story.id}`} storyId={story.id} initial={story.reactions} />
                    </div>
                    <Comments key={`comments-${story.id}`} storyId={story.id} />
                </div>
            </div>

            {/* ================= 8. MORE FROM THIS CATEGORY ================= */}
            {moreStories.length > 0 && (
                <section className='mx-auto mt-20 max-w-6xl px-4'>
                    <SectionHeading title={`More from ${story.category}`} accent='red' />
                    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                        {moreStories.map(s => (
                            <StoryGridCard key={s.id} story={s} />
                        ))}
                    </div>
                </section>
            )}

            {/* Focus mode draws itself over everything else. */}
            {focus && (
                <FocusView
                    title={story.title}
                    body={story.body}
                    textSize={textSize}
                    onClose={() => setFocus(false)}
                />
            )}
        </article>
    )
}

export default StoryPage
