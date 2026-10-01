import { Link, useParams } from 'react-router-dom'
import { getSeries } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useApi } from '../../hooks/useApi'
import { pluralize } from '../../utils/format'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'


// ---------------------------------------------------------------
// ONE SERIES (/series/:id) - anyone can look.
// The title, who wrote it, and every part in order. Drafts and
// stories you may not see are left out by Django (stories_for).
// ---------------------------------------------------------------
function SeriesPage() {
    const { id } = useParams()
    // [id]: load again when you go from one series to another.
    const { data: series, error } = useApi(() => getSeries(id), [id])
    usePageTitle(series?.title)

    if (error) {
        return <PageLayout title='Series not found'><PageMessage title='This series does not exist.' /></PageLayout>
    }
    if (!series) {
        return <PageLayout title='Series'><PageMessage title='Loading...' /></PageLayout>
    }

    return (
        <PageLayout
            title={series.title}
            subtitle={`A series by ${series.author} · ${pluralize(series.part_count, 'part', 'parts')}`}
            width='narrow'
        >
            {series.description && <p className='mb-6 text-gray-300'>{series.description}</p>}

            {series.parts.length === 0 && <PageMessage title='No parts yet' text='The first part is still being written.' />}

            {/* <ol> = a NUMBERED list - exactly what a series is. */}
            <ol className='space-y-3'>
                {series.parts.map((part, index) => (
                    <li key={part.id}>
                        <Link to={`/stories/${part.id}`} className='flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-red-800'>
                            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-900/60 font-bold text-red-100'>
                                {index + 1}
                            </span>
                            <span className='min-w-0'>
                                <span className='block font-semibold text-white'>{part.title}</span>
                                {part.excerpt && <span className='block truncate text-sm text-gray-400'>{part.excerpt}</span>}
                            </span>
                        </Link>
                    </li>
                ))}
            </ol>
        </PageLayout>
    )
}

export default SeriesPage
