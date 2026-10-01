// ---------------------------------------------------------------
// The dark box every sidebar section sits in (Trending, Horror
// Calendar, Villain of the Week, Quote of the Day).
//
// Usage:
//   <SidebarBox title='Trending' badge='Most read'>
//       ...anything...
//   </SidebarBox>
//
// `children` = whatever you put between the opening and closing
// tags. That's how one box can hold a list, a calendar or a quote.
// title and badge are optional - leave out title for a box with no
// heading.
// ---------------------------------------------------------------
function SidebarBox({ title, badge, children }) {
    return (
        <section className='rounded-xl border border-slate-700/60 bg-slate-900/60 p-4'>
            {title && (
                <div className='mb-4 flex items-center gap-2'>
                    {/* The little red bar in front of the title. */}
                    <span className='h-4 w-1 rounded-full bg-red-600' />
                    <h2 className='font-bold text-white'>{title}</h2>

                    {badge && (
                        <span className='rounded-full border border-yellow-600/50 bg-yellow-950/40 px-2 py-0.5 text-[10px] text-yellow-400'>
                            {badge}
                        </span>
                    )}
                </div>
            )}

            {children}
        </section>
    )
}

export default SidebarBox
