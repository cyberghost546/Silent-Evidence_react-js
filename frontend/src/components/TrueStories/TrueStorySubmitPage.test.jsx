import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TrueStorySubmitPage from './TrueStorySubmitPage'
import { getMyTrueStories, submitTrueStory } from '../../api/client'


// The "share a true story" form. Django is faked (vi.mock).
vi.mock('../../api/client', () => ({
    getMyTrueStories: vi.fn(),
    submitTrueStory: vi.fn(),
    withdrawTrueStory: vi.fn(),
    getCategories: vi.fn(() => Promise.resolve([{ id: 1, name: 'Hauntings' }])),
    getSiteStatus: vi.fn(() => Promise.resolve({})),
}))
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user: { username: 'witness' } }),
}))

const FIFTY_WORDS = 'word '.repeat(50).trim()

function renderPage() {
    render(<MemoryRouter><TrueStorySubmitPage /></MemoryRouter>)
}

describe('TrueStorySubmitPage', () => {
    beforeEach(() => {
        getMyTrueStories.mockResolvedValue([
            { id: 4, title: 'The Knock', status: 'rejected', admin_note: 'Needs more detail.', story_id: null, created_at: '2026-09-20T10:00:00Z' },
        ])
        submitTrueStory.mockReset()
    })

    it('shows your earlier submissions with their status and the admin note', async () => {
        renderPage()
        expect(await screen.findByText('The Knock')).toBeInTheDocument()
        expect(screen.getByText('Not published')).toBeInTheDocument()
        expect(screen.getByText('Admin: Needs more detail.')).toBeInTheDocument()
    })

    it('only sends once there are 50 words and the box is ticked', async () => {
        submitTrueStory.mockResolvedValue({ id: 5 })
        renderPage()
        const send = screen.getByRole('button', { name: 'Send for review' })

        await userEvent.type(screen.getByLabelText('Title'), 'The Hallway')
        await userEvent.click(screen.getByLabelText('What happened?'))
        await userEvent.paste(FIFTY_WORDS)
        expect(send).toBeDisabled()                       // box not ticked yet

        await userEvent.click(screen.getByRole('checkbox'))
        await userEvent.click(send)
        expect(submitTrueStory).toHaveBeenCalledWith({ title: 'The Hallway', where_when: '', category_id: null, body: FIFTY_WORDS, confirm_true: true, latitude: null, longitude: null })
        expect(await screen.findByText(/your story was sent/)).toBeInTheDocument()
    })
})
