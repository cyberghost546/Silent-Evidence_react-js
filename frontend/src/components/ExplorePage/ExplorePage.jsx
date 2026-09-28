import { Link, useParams, useNavigate } from 'react-router-dom'
import { getStories } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { usePageTitle } from '../../hooks/usePageTitle'
import StoryGridCard from '../StorySections/StoryGridCard'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import SegmentedControl from '../SegmentedControl/SegmentedControl'


// ---------------------------------------------------------------
// EXPLORE (/explore/latest, /explore/popular, /explore/timeline)
// - the three pages in the Explore menu (Header.jsx), and the
// "View all" link under Latest Stories on the homepage.
//
// ONE component for all three: :mode in the URL picks what to show.
//   latest   - newest first
//   popular  - most views first
//   timeline - every story, grouped by the month it came out
// The stories come from the normal list (/api/stories/?sort=...).
// ---------------------------------------------------------------
const MODES = {
    latest: { title: 'Latest stories', subtitle: 'Fresh from the writers - newest first.', sort: 'newest' },
    popular: { title: 'Most viewed', subtitle: 'The stories everyone is reading.', sort: 'popular' },
    timeline: { title: 'Timeline', subtitle: 'Every story, month by month.', sort: 'newest' },
}

const TABS = [
    { value: 'latest', label: 'Latest' },
    { value: 'popular', label: 'Most viewed' },
    { value: 'timeline', label: 'Timeline' },
]

// "2026-09-27T..." -> "September 2026" (the heading for that month).
function monthOf(isoDate) {
    return new Date(isoDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}


function ExplorePage() {
    const { mode = 'latest' } = useParams()
    const navigate = useNavigate()
    // An unknown mode in the URL (/explore/whatever) -> Latest.
    const settings = MODES[mode] || MODES.latest
    usePageTitle(settings.title)
    const { data: stories, error } = useApi(() => getStories({ sort: settings.sort, limit: 60 }), [settings.sort])

    // Timeline: group into { 'September 2026': [...], 'August 2026': [...] }.
    // The stories are already newest first, so the months come out in order.
    const months = {}
    for (const story of stories ?? []) {
        const month = monthOf(story.created_at)
        months[month] = [...(months[month] || []), story]
    }

    return (
        <PageLayout
            title={settings.title}
            subtitle={settings.subtitle}
            action={<SegmentedControl label='Explore' options={TABS} value={MODES[mode] ? mode : 'latest'} onChange={value => navigate(`/explore/${value}`)} />}
        >
            {error && <PageMessage title='Could not load the stories' text={error} />}
            {stories?.length === 0 && <PageMessage title='No stories yet' text='Be the first to write one!' />}

            {mode === 'timeline' ? (
                <div className='space-y-10'>
                    {Object.entries(months).map(([month, monthStories]) => (
                        <section key={month}>
                            <h2 className='mb-3 text-lg font-bold text-white'>{month} <span className='text-sm font-normal text-gray-500'>· {monthStories.length}</span></h2>
                            <ul className='space-y-2 border-l-2 border-slate-700 pl-5'>
                                {monthStories.map(story => (
                                    <li key={story.id} className='text-sm'>
                                        <span className='mr-2 tabular-nums text-gray-500'>{new Date(story.created_at).getDate()}</span>
                                        <Link to={`/stories/${story.id}`} className='font-semibold text-gray-100 hover:text-red-400'>{story.title}</Link>
                                        <span className='text-gray-500'> by {story.author}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            ) : (
                <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                    {stories?.map(story => <StoryGridCard key={story.id} story={story} />)}
                </div>
            )}
        </PageLayout>
    )
}

export default ExplorePage
