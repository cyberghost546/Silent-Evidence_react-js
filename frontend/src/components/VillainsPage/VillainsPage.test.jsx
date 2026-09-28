import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import VillainsPage from './VillainsPage'
import { getVillains, nominateVillain, voteVillain, getStories } from '../../api/client'


// ---------------------------------------------------------------
// Villain of the Week page. Django is faked (vi.mock) - see
// Comments.test.jsx for how that works.
// ---------------------------------------------------------------
let user = null
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user }),
}))
vi.mock('../../api/client', () => ({
    getVillains: vi.fn(),
    nominateVillain: vi.fn(),
    voteVillain: vi.fn(),
    removeVillain: vi.fn(),
    getStories: vi.fn(),
    // PageLayout asks for the site status (announcement bar etc.).
    getSiteStatus: vi.fn(() => Promise.resolve({})),
}))

const KEEPER = { id: 1, name: 'The Keeper', reason: 'He never blinks.', story: { id: 5, title: 'The Lighthouse' }, nominated_by: 'moth', votes: 3, is_my_vote: false }
const TALL_MAN = { id: 2, name: 'The Tall Man', reason: '', story: null, nominated_by: 'owl', votes: 1, is_my_vote: true }
const DATA = {
    week: '2026-09-28',
    nominations: [KEEPER, TALL_MAN],
    has_nominated: false,
    past_winners: [{ ...KEEPER, id: 7, name: 'The Drowned Man', week: '2026-09-21', story: null }],
}

function renderPage(path = '/villains') {
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path='/villains' element={<VillainsPage />} />
                <Route path='/villains/nominate' element={<VillainsPage />} />
                <Route path='/login' element={<p>Log In page</p>} />
            </Routes>
        </MemoryRouter>
    )
}


describe('VillainsPage', () => {
    beforeEach(() => {
        user = { id: 1, username: 'raven' }
        getVillains.mockResolvedValue(DATA)
        getStories.mockResolvedValue([])
        nominateVillain.mockReset()
        voteVillain.mockReset()
    })

    it('shows the race, your vote and last week\'s winner', async () => {
        renderPage()
        expect(await screen.findByText('The Keeper')).toBeInTheDocument()
        expect(screen.getByText('The Lighthouse')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '✓ Your vote' })).toBeInTheDocument()
        expect(screen.getByText('The Drowned Man')).toBeInTheDocument()
    })

    it('votes for a villain', async () => {
        voteVillain.mockResolvedValue({ voted_for: 1 })
        renderPage()
        await userEvent.click(await screen.findByRole('button', { name: 'Vote' }))
        expect(voteVillain).toHaveBeenCalledWith(1)
    })

    it('/villains/nominate opens the form and sends the nomination', async () => {
        nominateVillain.mockResolvedValue({ id: 3 })
        renderPage('/villains/nominate')
        await userEvent.type(await screen.findByLabelText('The villain'), 'The Smiling Man')
        await userEvent.click(screen.getByRole('button', { name: 'Nominate' }))
        expect(nominateVillain).toHaveBeenCalledWith('The Smiling Man', '', '')
    })

    it('sends visitors to log in when they vote', async () => {
        user = null
        renderPage()
        await userEvent.click(await screen.findByRole('button', { name: 'Vote' }))
        expect(await screen.findByText('Log In page')).toBeInTheDocument()
    })
})
