import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthorTrends from './AuthorTrends'
import { getAuthorTrends } from '../../api/client'


// The "Over time" part of the Author Dashboard. Django is faked.
vi.mock('../../api/client', () => ({
    getAuthorTrends: vi.fn(),
}))

// 12 weeks: only the last one had readers.
const WEEKS = Array.from({ length: 12 }, (_, i) => ({
    week: `2026-07-${String(6 + i).padStart(2, '0')}`,
    views: i, likes: 0, readers: 0, finished: 0, read_through: null,
}))
WEEKS[11] = { ...WEEKS[11], readers: 4, finished: 3, read_through: 75 }

describe('AuthorTrends', () => {
    it('shows weekly read-through (– for weeks nobody read) and the per-story table', async () => {
        getAuthorTrends.mockResolvedValue({
            weeks: WEEKS,
            stories: [{ id: 3, title: 'The Well', readers: 4, finished: 3, read_through: 75 }],
            views_tracked_since: '2026-07-06',
            total_views_12_weeks: 66,
        })
        render(<MemoryRouter><AuthorTrends /></MemoryRouter>)

        expect(await screen.findByText('66 in 12 weeks')).toBeInTheDocument()
        expect(screen.getAllByText('–')).toHaveLength(11)
        const row = screen.getByRole('link', { name: 'The Well' }).closest('tr')
        expect(within(row).getByText('75%')).toBeInTheDocument()
    })
})
