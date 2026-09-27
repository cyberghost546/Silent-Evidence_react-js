import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PollBox from './PollBox'
import { getCurrentPoll, votePoll } from '../../api/client'


// ---------------------------------------------------------------
// The homepage poll. Django is faked (vi.mock) - see Comments.test.jsx
// for how that works.
// ---------------------------------------------------------------
let user = null
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user }),
}))
vi.mock('../../api/client', () => ({
    getCurrentPoll: vi.fn(),
    votePoll: vi.fn(),
}))

const OPTIONS = [
    { id: 1, text: 'Ghosts', votes: 1, percent: 50 },
    { id: 2, text: 'Clowns', votes: 1, percent: 50 },
]
const POLL = { id: 9, question: 'Which monster scares you most?', total_votes: 2, my_vote: null, options: OPTIONS }

function renderPoll() {
    render(
        <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path='/' element={<PollBox />} />
                <Route path='/login' element={<p>Log In page</p>} />
            </Routes>
        </MemoryRouter>
    )
}


describe('PollBox', () => {
    beforeEach(() => {
        user = { id: 1, username: 'raven' }
        getCurrentPoll.mockResolvedValue(POLL)
        votePoll.mockReset()
    })

    it('shows the question with a button per answer', async () => {
        renderPoll()
        expect(await screen.findByText('Which monster scares you most?')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Ghosts' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Clowns' })).toBeInTheDocument()
    })

    it('shows the results after you vote', async () => {
        votePoll.mockResolvedValue({
            ...POLL,
            total_votes: 3,
            my_vote: 1,
            options: [{ ...OPTIONS[0], votes: 2, percent: 67 }, { ...OPTIONS[1], percent: 33 }],
        })
        renderPoll()
        await userEvent.click(await screen.findByRole('button', { name: 'Ghosts' }))

        expect(votePoll).toHaveBeenCalledWith(9, 1)
        expect(await screen.findByText('67%')).toBeInTheDocument()
        expect(screen.getByText('3 votes')).toBeInTheDocument()
        // No more vote buttons once you've voted.
        expect(screen.queryByRole('button', { name: 'Clowns' })).not.toBeInTheDocument()
    })

    it('sends visitors to Log In instead of voting', async () => {
        user = null
        renderPoll()
        await userEvent.click(await screen.findByRole('button', { name: 'Ghosts' }))

        expect(votePoll).not.toHaveBeenCalled()
        expect(await screen.findByText('Log In page')).toBeInTheDocument()
    })

    it('shows nothing when there is no active poll', async () => {
        getCurrentPoll.mockResolvedValue(null)
        const { container } = render(<MemoryRouter><PollBox /></MemoryRouter>)
        // Give the (fake) request a moment to finish.
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(container).toBeEmptyDOMElement()
    })
})
