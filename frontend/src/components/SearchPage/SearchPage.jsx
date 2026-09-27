import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchSite } from '../../api/client'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import Avatar from '../Avatar/Avatar'
import StoryGridCard from '../StorySections/StoryGridCard'
import SearchBox from '../SearchBox/SearchBox'
import { BUTTON_STYLE } from '../../styles/formStyles'
import { usePageTitle } from '../../hooks/usePageTitle'


// ---------------------------------------------------------------
// SEARCH (/search?q=house) - anyone can use it.
//
// The search words live in the URL (?q=house), not only in state.
// That way:
//   - the browser's Back button goes back to your previous search
//   - you can copy the link and send someone your results
//   - the header's search icon can just link to /search
//
// useSearchParams() is React Router's way to read and change the
// ?key=value part of the URL - like useState, but stored in the URL.
//
// Django: SearchView in backend/stories/views.py.
// ---------------------------------------------------------------
function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams()

    // What's in the URL right now ('' if there's no ?q=).
    const query = searchParams.get('q') || ''
    usePageTitle(query ? `Search: ${query}` : 'Search')

    // null = nothing searched yet. Otherwise
    // { query: 'house', stories: [...], authors: [...] }.
    // We keep WHICH query the results are for - see `loading` below.
    const [results, setResults] = useState(null)

    // Search again every time ?q= in the URL changes.
    useEffect(() => {
        // Nothing (or 1 letter) to search for: no request at all.
        if (query.trim().length < 2) return

        let ignore = false   // the usual "old answer arrived late" guard

        searchSite(query)
            .then(data => {
                // ...data = copy stories and authors into the object.
                if (!ignore) setResults({ query, ...data })
            })
            .catch(() => {
                if (!ignore) setResults({ query, stories: [], authors: [] })
            })

        return () => {
            ignore = true
        }
    }, [query])

    // SearchBox calls this with the words (already trimmed, 2+ letters).
    // Putting them in the URL is what starts the search (the
    // useEffect above is watching `query`).
    function handleSearch(words) {
        setSearchParams({ q: words })
    }

    // Shortcuts for the JSX below.
    // A 1-letter ?q= counts as "no search".
    const isValidQuery = query.trim().length >= 2

    // Loading = we have a search, but no results FOR IT yet. No extra
    // true/false state needed - it follows from what we already have.
    const loading = isValidQuery && results?.query !== query
    const hasSearched = isValidQuery && !loading
    const nothingFound = hasSearched && results.stories.length === 0 && results.authors.length === 0

    return (
        <PageLayout title='Search' subtitle='Find stories by title, words in the story, or writer.'>

            {/* ---------- THE SEARCH BOX ---------- */}
            {/* SearchBox (components/SearchBox) keeps the typed text
                itself and calls handleSearch when you search.

                key={query}: when the URL's ?q= changes some OTHER way
                (the browser's Back button), React throws the old box
                away and makes a new one - so the box shows the right
                words again. A changed key = a brand-new component. */}
            <SearchBox key={query} startText={query} onSearch={handleSearch} autoFocus />

            {/* ---------- RESULTS ---------- */}
            <div className='mt-10'>
                {loading && <p className='text-gray-400'>Searching...</p>}

                {!loading && !hasSearched && (
                    <PageMessage title='What are you looking for?' text='Type at least 2 letters and press Search.' />
                )}

                {!loading && nothingFound && (
                    <PageMessage title={`Nothing found for "${query}".`} text='Try fewer or different words.'>
                        <Link to='/random' className={BUTTON_STYLE}>Read a random story</Link>
                    </PageMessage>
                )}

                {!loading && hasSearched && !nothingFound && (
                    <div className='space-y-10'>

                        {/* Writers whose name matches. */}
                        {results.authors.length > 0 && (
                            <section>
                                <h2 className='mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500'>Writers</h2>
                                <div className='flex flex-wrap gap-3'>
                                    {results.authors.map(author => (
                                        <Link
                                            key={author.username}
                                            to={`/profile/${author.username}`}
                                            className='flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 py-2 pl-2 pr-5 transition-colors hover:border-slate-500'
                                        >
                                            <Avatar username={author.username} image={author.avatar} />
                                            <span>
                                                <span className='block text-sm font-semibold text-white'>{author.username}</span>
                                                <span className='block text-xs text-gray-400'>
                                                    {author.story_count} {author.story_count === 1 ? 'story' : 'stories'}
                                                </span>
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {results.stories.length > 0 && (
                            <section>
                                <h2 className='mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500'>
                                    Stories ({results.stories.length})
                                </h2>
                                <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                                    {results.stories.map(story => (
                                        <StoryGridCard key={story.id} story={story} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </PageLayout>
    )
}

export default SearchPage
