import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import StoryPage from './StoryPage'
import { getStory } from '../../api/client'


// ---------------------------------------------------------------
// The story page - the page people visit most.
//
// vi.mock with importOriginal = "keep the REAL client.js, but swap
// these few functions for fakes". Handy when a page uses many
// functions and we only care about some of them.
//
// STORY is exactly what Django sends (copied from a real answer).
// ---------------------------------------------------------------
vi.mock('../../api/client', async importOriginal => ({
    ...(await importOriginal()),
    getStory: vi.fn(),
    getStories: vi.fn(() => Promise.resolve([])),
    getComments: vi.fn(() => Promise.resolve([])),
    saveReadingProgress: vi.fn(() => Promise.resolve({})),
    getSiteStatus: vi.fn(() => Promise.resolve({})),
}))
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user: null }),
}))

const STORY = {
    id: 8, title: 'The Well', excerpt: 'Down there.', cover_image: null, category: 'Amnesia Horror', author: 'shape_writer',
    reading_time: 1, views: 1, created_at: '2026-09-28T14:38:49Z', content_rating: 'all', fear_average: null,
    body: 'It was dark.\n\nThen it was darker.', category_slug: 'amnesia-horror', word_count: 7, like_count: 0,
    comment_count: 0, liked: false, saved: false, coauthors: [], tags: [], series: null, lock: null,
    fear: { average: null, votes: 0, mine: null }, reactions: { counts: { got_me: 0, cant_sleep: 0, creepy: 0 }, mine: [] },
    is_draft: false, my_beta_feedback: [], my_progress: 0, language: 'en', video_url: '', audio_url: '', location: '',
    latitude: null, longitude: null, mood: '', content_warnings: '',
}

function renderStory() {
    render(
        <MemoryRouter initialEntries={['/stories/8']}>
            <Routes>
                <Route path='/stories/:id' element={<StoryPage />} />
            </Routes>
        </MemoryRouter>
    )
}

describe('StoryPage', () => {
    beforeEach(() => {
        getStory.mockReset()
        window.scrollTo = vi.fn()   // jsdom doesn't have it
    })

    it('shows the story text, paragraph by paragraph', async () => {
        getStory.mockResolvedValue(STORY)
        renderStory()
        expect(await screen.findByRole('heading', { level: 1, name: 'The Well' })).toBeInTheDocument()
        expect(screen.getByText('It was dark.')).toBeInTheDocument()
        expect(screen.getByText('Then it was darker.')).toBeInTheDocument()
        expect(getStory).toHaveBeenCalledWith('8')
    })

    it('an 18+ story shows the lock instead of the text', async () => {
        // What Django sends a visitor for an 18+ story: no body at all.
        getStory.mockResolvedValue({ ...STORY, content_rating: 'mature', body: '', lock: 'login' })
        renderStory()
        expect(await screen.findByRole('heading', { name: 'This story is for readers 18 and over' })).toBeInTheDocument()
        expect(screen.queryByText('It was dark.')).not.toBeInTheDocument()
        // No reading tools on a locked story (there's nothing to read aloud).
        expect(screen.queryByRole('button', { name: 'Listen' })).not.toBeInTheDocument()
    })

    it("plays the writer's own narration when there is one", async () => {
        getStory.mockResolvedValue({ ...STORY, audio: '/media/audio/reading.mp3' })
        renderStory()
        expect(await screen.findByText('🎙️ Narrated by shape_writer')).toBeInTheDocument()
        expect(document.querySelector('audio').getAttribute('src')).toMatch(/\/media\/audio\/reading\.mp3$/)
    })

    it('a missing story shows "Story not found"', async () => {
        getStory.mockRejectedValue({ status: 404 })
        renderStory()
        expect(await screen.findByText('Story not found')).toBeInTheDocument()
    })
})
