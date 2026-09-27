import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Package } from 'lucide-react'
import { getBundles, getBundle } from '../../api/client'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import StoryGridCard from '../StorySections/StoryGridCard'


// ---------------------------------------------------------------
// BUNDLES - hand-picked story collections. Anyone can read them.
//
//   /bundles                     -> every published bundle
//   /bundles/best-haunted-houses -> one bundle and its stories
//
// Same set-up as ChallengesPage: one file, two views, picked by
// whether the URL has a :slug. Admins make bundles on
// Admin Dashboard -> Bundles.
// ---------------------------------------------------------------

function BundleList() {
    const [bundles, setBundles] = useState(null)

    useEffect(() => {
        getBundles()
            .then(data => setBundles(data))
            .catch(() => setBundles([]))
    }, [])

    if (bundles === null) return <p className='py-20 text-center text-gray-400'>Loading...</p>
    if (bundles.length === 0) return <PageMessage title='No bundles yet.' text='Our editors are picking the best stories - check back soon.' />

    return (
        <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
            {bundles.map(bundle => (
                <Link
                    key={bundle.id}
                    to={`/bundles/${bundle.slug}`}
                    className='group block rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-colors hover:border-red-700'
                >
                    <Package className='h-7 w-7 text-red-500' />
                    <h2 className='mt-3 text-xl font-bold text-white group-hover:text-red-300'>{bundle.title}</h2>
                    <p className='mt-2 line-clamp-3 text-sm text-gray-400'>{bundle.description}</p>
                    <p className='mt-4 text-xs text-gray-500'>{bundle.story_count} {bundle.story_count === 1 ? 'story' : 'stories'}</p>
                </Link>
            ))}
        </div>
    )
}


function BundleDetail({ slug }) {
    const [bundle, setBundle] = useState(null)

    useEffect(() => {
        getBundle(slug)
            .then(data => setBundle(data))
            .catch(() => setBundle('not-found'))
    }, [slug])

    if (bundle === null) return <p className='py-20 text-center text-gray-400'>Loading...</p>
    if (bundle === 'not-found') return <PageMessage title='This bundle does not exist.' />

    return (
        <div>
            <Link to='/bundles' className='text-sm text-gray-400 hover:text-white'>← All bundles</Link>
            <h2 className='mt-4 text-3xl font-bold text-white'>{bundle.title}</h2>
            {bundle.description && <p className='mt-2 max-w-2xl text-gray-400'>{bundle.description}</p>}

            <div className='mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                {bundle.stories.map(story => (
                    <StoryGridCard key={story.id} story={story} />
                ))}
            </div>
            {bundle.stories.length === 0 && <p className='mt-6 text-gray-500'>This bundle is empty for now.</p>}
        </div>
    )
}


function BundlesPage() {
    const { slug } = useParams()

    return (
        <PageLayout title='Bundles' subtitle='Hand-picked collections of our scariest stories.'>
            {slug ? <BundleDetail key={slug} slug={slug} /> : <BundleList />}
        </PageLayout>
    )
}

export default BundlesPage
