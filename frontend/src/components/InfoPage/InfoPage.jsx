import { useParams } from 'react-router-dom'
import PageLayout from '../PageLayout/PageLayout'
import NotFound from '../NotFound/NotFound'
import { INFO_PAGES } from './infoPages'


// ---------------------------------------------------------------
// ONE component for all the "just text" pages:
//   /about, /privacy, /terms, /acceptable-use, /copyright, /cookies
//
// The words live in infoPages.js, not here. This file only knows
// how to DRAW a page: a title, an intro, then sections of
// heading + paragraphs.
//
// App.jsx has one route for all of them: path='/:page' (see there).
// useParams() gives us 'about' or 'privacy'..., and we look that up
// in INFO_PAGES. Adding a page = adding an entry in infoPages.js.
// ---------------------------------------------------------------
function InfoPage() {
    const { page } = useParams()
    const content = INFO_PAGES[page]

    // /anything-else -> the normal "Page not found".
    if (!content) return <NotFound />

    return (
        <PageLayout title={content.title} subtitle={content.intro} width='narrow'>

            {/* Legal pages carry a reminder that the text is a
                starting point (see the comment in infoPages.js). */}
            {content.isLegal && (
                <p className='mb-8 rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-xs text-amber-300'>
                    Draft text for this project. Have it checked before the site goes live.
                    Last updated {content.updated}.
                </p>
            )}

            <div className='space-y-10'>
                {content.sections.map(section => (
                    <section key={section.heading}>
                        <h2 className='text-xl font-bold text-white'>{section.heading}</h2>

                        {/* Each paragraph is a string in a list. */}
                        {section.paragraphs.map((paragraph, index) => (
                            // key={index} is fine: the text never changes order.
                            <p key={index} className='mt-3 leading-7 text-gray-300'>{paragraph}</p>
                        ))}

                        {/* An optional bullet list. */}
                        {section.bullets && (
                            // list-disc = the round bullets. pl-5 makes
                            // room for them on the left.
                            <ul className='mt-3 list-disc space-y-1.5 pl-5 text-gray-300'>
                                {section.bullets.map(bullet => (
                                    <li key={bullet}>{bullet}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}
            </div>
        </PageLayout>
    )
}

export default InfoPage
