import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { LayoutGrid, List } from 'lucide-react'
import { getCategory, getStories } from '../../api/client'
import { CATEGORY_COLORS } from '../../styles/categoryColors'
import { CATEGORY_ICONS, FALLBACK_ICON } from '../CategoryGrid/categoryIcons'
import Breadcrumbs from '../Breadcrumbs/Breadcrumbs'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import StoryGridCard from '../StorySections/StoryGridCard'
import StoryCard from '../StorySections/StoryCard'
import EmptyState from '../StorySections/EmptyState'
import NotFound from '../NotFound/NotFound'
import styles from './CategoryPage.module.css'
import { usePageTitle } from '../../hooks/usePageTitle'


// The toggle buttons' options live outside the component - they
// never change, so there's no need to rebuild them on every render.
// The values match what the API understands: /api/stories/?sort=popular
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Popular' },
    { value: 'oldest', label: 'Oldest' },
    // Highest fear meter first (only stories someone rated).
    { value: 'scariest', label: 'Scariest' },
]

// The name the grid/list choice is saved under in the browser.
const VIEW_STORAGE_KEY = 'storyListView'

const VIEW_OPTIONS = [
    { value: 'grid', label: <LayoutGrid className='h-4 w-4' />, ariaLabel: 'Grid view' },
    { value: 'list', label: <List className='h-4 w-4' />, ariaLabel: 'List view' },
]


// ===============================================================
// ONE CATEGORY'S PAGE  (/category/paranormal)
//
//   Header:  breadcrumbs, icon + name + description,
//            story count, Newest/Popular/Oldest toggle
//   Body:    grid/list toggle, then the stories
//
// Two requests:
//   /api/categories/<slug>/            - the category (once)
//   /api/stories/?category=<slug>&sort - its stories (again every
//                                        time the sort changes)
// ===============================================================
function CategoryPage() {
    // useParams() reads the ":slug" part of the route in App.jsx.
    // On /category/paranormal it gives { slug: 'paranormal' }.
    const { slug } = useParams()

    const [category, setCategory] = useState(null)
    usePageTitle(category?.name)
    const [notFound, setNotFound] = useState(false)

    // null = still loading, [] = loaded but empty.
    const [stories, setStories] = useState(null)

    const [sort, setSort] = useState('newest')

    // Grid or list - REMEMBERED between visits.
    //
    // localStorage is a small key/value store inside the browser that
    // survives page reloads (per site, per browser).
    //
    // Passing a FUNCTION to useState (instead of a value) means React
    // only runs it once, on the first render - so we don't read
    // localStorage again on every re-render. If nothing was saved
    // yet, getItem gives null and we fall back to 'grid'.
    const [view, setView] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || 'grid')

    // Whenever `view` changes, save it. Next visit, the line above
    // reads it back.
    useEffect(() => {
        localStorage.setItem(VIEW_STORAGE_KEY, view)
    }, [view])

    // ---------- Load the category ----------
    // [slug] = run again if the URL changes to another category.
    useEffect(() => {
        getCategory(slug)
            .then(data => setCategory(data))
            .catch(err => {
                // getJSON puts the HTTP status on the error (client.js).
                if (err.status === 404) {
                    setNotFound(true)
                } else {
                    console.error('Could not load category:', err)
                }
            })
    }, [slug])

    // ---------- Load the stories ----------
    // [slug, sort] = run again whenever EITHER changes, so clicking
    // "Popular" fetches the list again in the new order.
    useEffect(() => {
        // Click Newest, Oldest, Newest quickly and three requests race
        // each other - an OLD answer could arrive last and win. The
        // cleanup function runs before the next request starts and
        // flips `ignore`, so a late, out-of-date answer is thrown away.
        // (This is the pattern the React docs recommend for fetching.)
        let ignore = false

        getStories({ category: slug, sort: sort })
            .then(data => {
                if (!ignore) setStories(data)
            })
            .catch(err => console.error('Could not load stories:', err))

        return () => {
            ignore = true
        }
    }, [slug, sort])


    // ---------- The page ----------
    if (notFound) {
        return <NotFound title='Category not found' message={`There's no category called "${slug}".`} />
    }

    if (!category) {
        return <p className='bg-gray-900 py-24 text-center text-gray-400'>Loading...</p>
    }

    // Colour and icon for THIS category - the same lookups the
    // homepage tiles use, so a category looks the same everywhere.
    const colors = CATEGORY_COLORS[category.color] || CATEGORY_COLORS.red
    const Icon = CATEGORY_ICONS[category.icon] || FALLBACK_ICON

    return (
        <div className='bg-gray-900'>

            {/* ================= HEADER ================= */}
            {/* styles.hero = the red glow background (CSS Module). */}
            <div className={`${styles.hero} px-4 pt-12 pb-10`}>
                <div className='mx-auto max-w-6xl'>
                    <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: category.name }]} />

                    <div className='mt-8 flex items-center gap-5'>
                        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${colors.iconBox}`}>
                            <Icon className={`h-7 w-7 ${colors.icon}`} strokeWidth={1.75} />
                        </span>

                        {/* tracking-tight pulls the letters of a big
                            heading slightly closer - looks sharper. */}
                        <h1 className='text-4xl font-extrabold tracking-tight text-white sm:text-5xl'>
                            {category.name}
                        </h1>
                    </div>

                    {/* ml-19 lines the description up with the title
                        (icon box 14 + gap 5 = 19). */}
                    {category.description && (
                        <p className='mt-2 text-gray-400 sm:ml-19'>{category.description}</p>
                    )}

                    {/* Count on the left, sort toggle on the right. */}
                    <div className='mt-10 flex items-center justify-between gap-4'>
                        <p className='flex items-center gap-2 text-sm text-gray-400'>
                            <span className='h-1.5 w-1.5 rounded-full bg-red-500' />
                            {/* Bold number, normal word - so the number and
                                the word are written separately here. */}
                            <span>
                                <strong className='text-white'>{category.story_count}</strong>{' '}
                                {category.story_count === 1 ? 'story' : 'stories'}
                            </span>
                        </p>

                        <SegmentedControl label='Sort stories' options={SORT_OPTIONS} value={sort} onChange={setSort} />
                    </div>
                </div>
            </div>

            {/* ================= STORIES ================= */}
            <div className='px-4 pt-6 pb-16'>
                <div className='mx-auto max-w-6xl'>
                    <div className='mb-6 flex justify-end'>
                        <SegmentedControl label='Layout' options={VIEW_OPTIONS} value={view} onChange={setView} />
                    </div>

                    {stories === null && <p className='text-gray-400'>Loading stories...</p>}

                    {stories !== null && stories.length === 0 && (
                        <EmptyState
                            title='No stories here yet'
                            message={`Be the first to write a ${category.name.toLowerCase()} story.`}
                        />
                    )}

                    {/* GRID: tall cards, 1 / 2 / 3 per row. */}
                    {stories !== null && stories.length > 0 && view === 'grid' && (
                        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                            {stories.map(story => (
                                <StoryGridCard key={story.id} story={story} />
                            ))}
                        </div>
                    )}

                    {/* LIST: the wide card from the homepage, reused as-is. */}
                    {stories !== null && stories.length > 0 && view === 'list' && (
                        <div className='space-y-4'>
                            {stories.map(story => (
                                <StoryCard key={story.id} story={story} accent='red' />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CategoryPage
