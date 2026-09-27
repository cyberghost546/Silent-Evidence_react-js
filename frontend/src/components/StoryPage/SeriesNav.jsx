import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Library } from 'lucide-react'


// ---------------------------------------------------------------
// SERIES on the story page. Two small pieces:
//
//   <SeriesLabel series={story.series} />  - above the title:
//        "PART 2 OF 5 · THE LIGHTHOUSE DIARIES"
//   <SeriesNav series={story.series} />    - under the story:
//        [< Part 1: Night one]   [Part 3: Night three >]
//
// story.series comes from Django (StoryDetailSerializer.get_series):
//   { id, title, part, total, previous: {id, title} | null, next: ... }
// It's null when the story isn't in a series - then both draw nothing.
// ---------------------------------------------------------------

export function SeriesLabel({ series }) {
    if (!series) return null
    return (
        <Link
            to={`/series/${series.id}`}
            className='mt-6 flex w-fit items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300'
        >
            <Library className='h-3.5 w-3.5' />
            Part {series.part} of {series.total} · {series.title}
        </Link>
    )
}


export function SeriesNav({ series }) {
    if (!series) return null
    return (
        <nav aria-label='Series' className='mt-10 rounded-2xl border border-amber-900/50 bg-amber-950/10 p-4'>
            <p className='text-center text-sm text-gray-400'>
                This is part {series.part} of <Link to={`/series/${series.id}`} className='font-semibold text-amber-300 hover:text-amber-200'>{series.title}</Link>
            </p>
            {/* Two columns: previous on the left, next on the right.
                An empty <span /> keeps "next" on the right when
                there's no previous part. */}
            <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {series.previous ? (
                    <Link to={`/stories/${series.previous.id}`} className='flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-gray-200 hover:border-slate-500'>
                        <ChevronLeft className='h-4 w-4 shrink-0' />
                        <span className='min-w-0'>
                            <span className='block text-xs text-gray-500'>Part {series.part - 1}</span>
                            <span className='block truncate'>{series.previous.title}</span>
                        </span>
                    </Link>
                ) : <span />}
                {series.next && (
                    <Link to={`/stories/${series.next.id}`} className='flex items-center justify-end gap-2 rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-right text-sm text-white hover:border-red-600'>
                        <span className='min-w-0'>
                            <span className='block text-xs text-red-300'>Next: part {series.part + 1}</span>
                            <span className='block truncate'>{series.next.title}</span>
                        </span>
                        <ChevronRight className='h-4 w-4 shrink-0' />
                    </Link>
                )}
            </div>
        </nav>
    )
}
