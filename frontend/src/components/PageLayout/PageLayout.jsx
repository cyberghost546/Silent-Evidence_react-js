// ---------------------------------------------------------------
// The frame for a simple page: dark blue background, a centred
// column, and a big title with the red bar in front.
//
//     ▌ My Lists                          [ something on the right ]
//       Stories you saved to read later.
//
// Usage:
//   <PageLayout title='My Lists' subtitle='Stories you saved.'>
//       ...the page content...
//   </PageLayout>
//
//   With a button on the right of the title:
//   <PageLayout title='Reading History' action={<button>Clear</button>}>
//
//   A narrower page (for text, like About):
//   <PageLayout title='About' width='narrow'>
//
// Written once here, so My Lists, Reading History, My Stories,
// Search, Invites, About... all look the same. Change the look of
// every one of those pages by changing this file.
// ---------------------------------------------------------------

// max-w-6xl for pages with a grid of cards, max-w-3xl for reading.
const WIDTHS = {
    wide: 'max-w-6xl',
    narrow: 'max-w-3xl',
}

function PageLayout({ title, subtitle, action, width = 'wide', children }) {
    return (
        // min-h-screen: at least as tall as the window, so short
        // pages don't show the grey from .home in App.css underneath.
        <div className='min-h-screen bg-[#0f172a]'>
            <div className={`mx-auto px-4 py-12 ${WIDTHS[width]}`}>

                {/* flex-wrap: on a phone the action goes under the title. */}
                <div className='flex flex-wrap items-center justify-between gap-4'>
                    <div>
                        <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                            {/* The red bar: an empty span with a width,
                                a height and a colour. */}
                            <span className='h-8 w-1 rounded-full bg-red-600' />
                            {title}
                        </h1>
                        {/* ml-4 lines it up with the title text (past
                            the red bar). */}
                        {subtitle && <p className='ml-4 mt-2 text-sm text-gray-400'>{subtitle}</p>}
                    </div>

                    {action}
                </div>

                <div className='mt-8'>{children}</div>
            </div>
        </div>
    )
}

export default PageLayout


// ---------------------------------------------------------------
// The "nothing here" box with buttons, used by many of these pages.
// (The same idea as FeedMessage on the My Feed page.)
//
// Usage:
//   <PageMessage title='No saved stories yet.' text='Press Save on a story...'>
//       <Link to='/' className={BUTTON_STYLE}>Discover stories</Link>
//   </PageMessage>
// ---------------------------------------------------------------
export function PageMessage({ title, text, children }) {
    return (
        <div className='py-20 text-center'>
            <p className='text-lg text-gray-200'>{title}</p>
            {text && <p className='mt-3 text-sm text-gray-500'>{text}</p>}
            {children && (
                <div className='mt-6 flex flex-wrap items-center justify-center gap-4'>{children}</div>
            )}
        </div>
    )
}
