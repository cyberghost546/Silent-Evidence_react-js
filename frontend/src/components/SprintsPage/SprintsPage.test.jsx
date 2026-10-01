import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SprintsPage from './SprintsPage'
import { getSprints, saveSprint, getRandomPrompt } from '../../api/client'


// ---------------------------------------------------------------
// Writing Sprints. Django is faked (vi.mock), and so is the CLOCK:
// vi.useFakeTimers() lets the test jump 10 minutes ahead instantly
// (see "time runs out" below).
// ---------------------------------------------------------------
let user = null
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user }),
}))
vi.mock('../../api/client', () => ({
    getSprints: vi.fn(),
    saveSprint: vi.fn(),
    getRandomPrompt: vi.fn(),
    getSiteStatus: vi.fn(() => Promise.resolve({})),
}))

const BOARD = {
    lengths: [10, 20, 30],
    leaderboard: [{ username: 'moth', words: 900, sprints: 3 }],
    me: { sprints: 1, best: 250, week_words: 250 },
}

function renderPage() {
    render(
        <MemoryRouter initialEntries={['/sprints']}>
            <Routes>
                <Route path='/sprints' element={<SprintsPage />} />
                <Route path='/write' element={<p>Write page</p>} />
            </Routes>
        </MemoryRouter>
    )
}

// Lets the fake promises (mockResolvedValue) finish.
async function flush() {
    await act(async () => {})
}


describe('SprintsPage', () => {
    beforeEach(() => {
        user = { id: 1, username: 'raven' }
        getSprints.mockResolvedValue(BOARD)
        getRandomPrompt.mockResolvedValue({ id: 1, text: 'The lights go out at the party.' })
        saveSprint.mockReset()
        localStorage.clear()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('shows the prompt and the leaderboard', async () => {
        renderPage()
        expect(await screen.findByText('"The lights go out at the party."')).toBeInTheDocument()
        expect(screen.getByText('moth')).toBeInTheDocument()
        expect(screen.getByText(/250 words this week/)).toBeInTheDocument()
    })

    it('counts words, saves when time runs out, and carries the text to /write', async () => {
        vi.useFakeTimers()
        saveSprint.mockResolvedValue({ id: 5, words: 4 })
        renderPage()
        await flush()

        fireEvent.click(screen.getByRole('button', { name: '10 min' }))
        fireEvent.click(screen.getByRole('button', { name: 'Start the 10-minute sprint' }))
        expect(screen.getByLabelText('Time left')).toHaveTextContent('10:00')

        fireEvent.change(screen.getByLabelText('Your sprint'), { target: { value: 'The lights went out.' } })
        expect(screen.getByText('4 words')).toBeInTheDocument()

        // Jump to the end of the sprint.
        await act(async () => {
            vi.advanceTimersByTime(10 * 60 * 1000)
        })
        expect(saveSprint).toHaveBeenCalledWith(4, 10)
        expect(screen.getByText('Saved to the leaderboard.')).toBeInTheDocument()

        // An existing draft keeps its title; the sprint goes after its body.
        localStorage.setItem('writeStoryDraft:raven', JSON.stringify({ title: 'Party', body: 'It began.' }))
        fireEvent.click(screen.getByRole('button', { name: 'Continue on the Write page' }))
        expect(screen.getByText('Write page')).toBeInTheDocument()
        expect(JSON.parse(localStorage.getItem('writeStoryDraft:raven'))).toEqual({ title: 'Party', body: 'It began.\n\nThe lights went out.' })
    })

    it('visitors can sprint but nothing is saved', async () => {
        user = null
        renderPage()
        fireEvent.click(await screen.findByRole('button', { name: 'Start the 20-minute sprint' }))
        fireEvent.change(screen.getByLabelText('Your sprint'), { target: { value: 'boo' } })
        fireEvent.click(screen.getByRole('button', { name: 'Finish early' }))
        expect(screen.getByText('1 word')).toBeInTheDocument()
        expect(saveSprint).not.toHaveBeenCalled()
        expect(screen.queryByRole('button', { name: 'Continue on the Write page' })).not.toBeInTheDocument()
    })
})
