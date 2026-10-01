import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SeasonalTakeover from './SeasonalTakeover'
import { getStories } from '../../api/client'


// The seasonal banner. Django is faked (vi.mock). The ?season=
// preview is used so the test doesn't depend on today's date.
vi.mock('../../api/client', () => ({
    getStories: vi.fn(),
}))
vi.mock('../../hooks/useMatureBlur', () => ({
    useMatureBlur: () => false,
}))

const STORY = { id: 7, title: 'The Pumpkin Patch', excerpt: 'It grinned.', cover_image: null, category: 'Folk Horror', author: 'raven', reading_time: 4, created_at: '2026-10-01T10:00:00Z' }

function renderBanner(path) {
    render(<MemoryRouter initialEntries={[path]}><SeasonalTakeover /></MemoryRouter>)
}

describe('SeasonalTakeover', () => {
    beforeEach(() => {
        getStories.mockReset()
        localStorage.clear()
    })

    it('shows the season with its tagged stories', async () => {
        getStories.mockResolvedValue([STORY])
        renderBanner('/?season=halloween')
        expect(screen.getByRole('heading', { name: 'Halloween is coming' })).toBeInTheDocument()
        expect(await screen.findByText('The Pumpkin Patch')).toBeInTheDocument()
        expect(getStories).toHaveBeenCalledWith({ tag: 'halloween', sort: 'popular', limit: 4 })
    })

    it('falls back to the scariest stories when nothing is tagged', async () => {
        getStories.mockResolvedValueOnce([]).mockResolvedValueOnce([STORY])
        renderBanner('/?season=halloween')
        expect(await screen.findByText('The Pumpkin Patch')).toBeInTheDocument()
        expect(getStories).toHaveBeenLastCalledWith({ sort: 'scariest', limit: 4 })
    })

    it('can be hidden', async () => {
        getStories.mockResolvedValue([])
        renderBanner('/?season=halloween')
        await userEvent.click(screen.getByRole('button', { name: 'Hide this banner' }))
        expect(screen.queryByText('Halloween is coming')).not.toBeInTheDocument()
        expect(Object.keys(localStorage)).toContain(`seasonDismissed:halloween:${new Date().getFullYear()}`)
    })
})
