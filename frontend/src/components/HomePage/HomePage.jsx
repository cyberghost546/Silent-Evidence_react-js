import SlideShow from '../SlideShow/SlideShow'
import StorySections from '../StorySections/StorySections'
import CategoryGrid from '../CategoryGrid/CategoryGrid'
import HomeFeed from '../HomeFeed/HomeFeed'
import WriteCallToAction from '../HomeFeed/WriteCallToAction'
import LastWords from '../HomeFeed/LastWords'
import MoodOfTheDay from '../HomeFeed/MoodOfTheDay'
import SpotlightBanner from '../HomeFeed/SpotlightBanner'
import SeasonalTakeover from '../HomeFeed/SeasonalTakeover'
import ContinueReading from '../HomeFeed/ContinueReading'
import RecommendedStories from '../HomeFeed/RecommendedStories'
import { usePageTitle } from '../../hooks/usePageTitle'


// The homepage ("/") is just its sections stacked top to bottom.
// Want a new section on the homepage? Build it as its own
// component and add one line here.
//
// The PAGE decides the background and the spacing between sections.
// The sections themselves have none - that's what lets you drop
// <CategoryGrid /> onto another page without fighting its padding.
function HomePage() {
    // No title = just the site name in the browser tab.
    usePageTitle()

    return (
        // <>...</> (a fragment) groups them without an extra <div>.
        <>
            {/* Every page should have ONE <h1> - screen readers use it to
                say "you are here", and search engines read it too. The
                homepage's big titles are in the slideshow, so this one is
                hidden: sr-only = "only for screen readers". */}
            <h1 className='sr-only'>Silent Evidence - horror stories, fiction and true</h1>
            {/* The dark background behind the slideshow: on phones the
                slideshow is a rounded card with a gap around it, and
                that gap should be the same dark colour as the page
                below - not the grey from App.css.
                pt-3 (not a margin on the slideshow): a child's top
                margin "leaks" out through a parent with no padding
                (CSS calls it margin collapsing) and shows grey again. */}
            <div className='bg-gray-900 pt-3 sm:pt-0'>
                <SlideShow />
            </div>

            {/* One dark band behind all the sections.
                space-y-20 = the same gap between every section.
                Phones: smaller gaps (space-y-12, py-8) - on a small
                screen big gaps just mean more scrolling. */}
            <div className='space-y-12 bg-gray-900 px-4 py-8 sm:space-y-20 sm:py-14'>
                {/* Only shows around Halloween, Friday the 13th...
                    (utils/horrorDays.js). Preview: /?season=halloween */}
                <SeasonalTakeover />
                {/* Only shows while an admin's spotlight runs. */}
                <SpotlightBanner />
                {/* Half-read stories (logged-in members only). */}
                <ContinueReading />
                {/* "Picked for you" (logged-in members with some reading history). */}
                <RecommendedStories />
                <StorySections />
                {/* Only shows when an admin planned a mood for today. */}
                <MoodOfTheDay />
                <CategoryGrid />

                {/* Authors, Latest Stories and the sidebar
                    (Trending, Horror Calendar...). See HomeFeed.jsx. */}
                <HomeFeed />
            </div>

            {/* These two go OUTSIDE the band above, because they have
                their own full-width backgrounds. */}
            <WriteCallToAction />
            <LastWords />
        </>
    )
}

export default HomePage
