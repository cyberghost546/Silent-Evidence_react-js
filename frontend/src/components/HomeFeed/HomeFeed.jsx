import AuthorsToFollow from './AuthorsToFollow'
import LatestStories from './LatestStories'
import TrendingList from './TrendingList'
import HorrorCalendar from './HorrorCalendar'
import VillainOfTheWeek from './VillainOfTheWeek'
import QuoteOfTheDay from './QuoteOfTheDay'
import PollBox from './PollBox'


// ---------------------------------------------------------------
// THE LOWER HALF OF THE HOMEPAGE
//
//   Authors to Follow  (full width)
//   ┌──────────────────────┬─────────────┐
//   │ Latest Stories       │ Trending    │
//   │ (grid of cards)      │ Calendar    │
//   │                      │ Villain     │
//   │                      │ Quote       │
//   └──────────────────────┴─────────────┘
//
// This file only ARRANGES the pieces. Each piece fetches its own
// data, so any of them can be dropped onto another page on its own,
// e.g. <TrendingList /> on the story page's sidebar.
// ---------------------------------------------------------------
function HomeFeed() {
    return (
        <div className='mx-auto max-w-6xl space-y-10'>
            <AuthorsToFollow />

            {/* Phones: one column (the sidebar goes UNDER the stories).
                Big screens (lg:): two columns - the stories take the
                space that's left, the sidebar is 300px.
                minmax(0,1fr) instead of 1fr stops a long word or wide
                card from pushing the column wider than the screen. */}
            <div className='grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]'>
                <LatestStories />

                {/* <aside> = "side content" - the right tag for a sidebar.
                    self-start: without it, the grid stretches the
                    sidebar as tall as the stories column. */}
                <aside className='space-y-6 self-start'>
                    {/* Only shows when an admin opened a poll. */}
                    <PollBox />
                    <TrendingList />
                    <HorrorCalendar />
                    <VillainOfTheWeek />
                    <QuoteOfTheDay />
                </aside>
            </div>
        </div>
    )
}

export default HomeFeed
