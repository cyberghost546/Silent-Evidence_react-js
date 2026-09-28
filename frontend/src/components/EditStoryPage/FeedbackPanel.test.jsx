import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeedbackPanel from './FeedbackPanel'
import { getStoryFeedback, askStoryFeedback } from '../../api/client'


// The feedback panel on the Edit page. Django (and Claude) are faked.
vi.mock('../../api/client', () => ({
    getStoryFeedback: vi.fn(),
    askStoryFeedback: vi.fn(),
}))

const ITEM = {
    id: 1, created_at: '2026-09-28T12:00:00Z',
    feedback: { overall: 'A tense story.', strengths: ['The cellar'], suggestions: [{ area: 'Opening', note: 'Start closer to the knock.' }], scares: 'The last line lands.' },
}

describe('FeedbackPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('asks Claude and shows the feedback', async () => {
        getStoryFeedback.mockResolvedValue({ configured: true, remaining_today: 3, history: [] })
        askStoryFeedback.mockResolvedValue({ feedback: ITEM.feedback, remaining_today: 2, history: [ITEM] })
        render(<FeedbackPanel storyId={7} />)
        await userEvent.click(await screen.findByRole('button', { name: 'Ask for feedback' }))
        expect(askStoryFeedback).toHaveBeenCalledWith(7)
        expect(await screen.findByText('A tense story.')).toBeInTheDocument()
        expect(screen.getByText('Start closer to the knock.')).toBeInTheDocument()
        expect(screen.getByText('2 left today')).toBeInTheDocument()
    })

    it('no button when the day is used up, or the site has no key', async () => {
        getStoryFeedback.mockResolvedValue({ configured: true, remaining_today: 0, history: [ITEM] })
        const { unmount } = render(<FeedbackPanel storyId={7} />)
        expect(await screen.findByRole('button', { name: 'Ask for feedback' })).toBeDisabled()
        expect(screen.getByText('A tense story.')).toBeInTheDocument()   // old feedback still readable
        unmount()

        getStoryFeedback.mockResolvedValue({ configured: false, remaining_today: 3, history: [] })
        render(<FeedbackPanel storyId={7} />)
        expect(await screen.findByText('Not switched on for this site.')).toBeInTheDocument()
    })
})
