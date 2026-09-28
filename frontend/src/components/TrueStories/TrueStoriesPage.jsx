import { Link } from 'react-router-dom'
import { getStories } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { usePageTitle } from '../../hooks/usePageTitle'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import StoryCard from '../StorySections/StoryCard'
import { BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// TRUE STORIES (/true-stories) - things members say really happened
// to them, published anonymously after an admin read them.
// They're normal stories with the tag "true-story" (see
// TrueStorySubmission in Django's stories/models.py).
// ---------------------------------------------------------------
function TrueStoriesPage() {
    usePageTitle('True Stories')
    const { data: stories, error } = useApi(() => getStories({ tag: 'true-story', limit: 60 }))

    return (
        <PageLayout
            title='True Stories'
            subtitle='They say these really happened. Shared anonymously by our members.'
            action={<Link to='/true-stories/submit' className={BUTTON_STYLE}>Share what happened to you</Link>}
        >
            {error && <PageMessage title='Could not load the stories' text={error} />}
            {stories?.length === 0 && (
                <PageMessage title='No true stories yet' text='Has something happened to you that you still cannot explain? You could be the first.' />
            )}
            <div className='space-y-4'>
                {stories?.map(story => <StoryCard key={story.id} story={story} />)}
            </div>
        </PageLayout>
    )
}

export default TrueStoriesPage
