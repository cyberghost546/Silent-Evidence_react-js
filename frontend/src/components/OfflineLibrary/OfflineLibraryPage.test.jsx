import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OfflineLibraryPage from './OfflineLibraryPage'


// The Downloaded stories page. The browser's Cache Storage is faked
// (jsdom doesn't have one); the list itself is in localStorage.
vi.mock('../../api/client', () => ({
    API_HOST: 'http://localhost:8000',
    getSiteStatus: vi.fn(() => Promise.resolve({})),
}))

const deleted = []
beforeEach(() => {
    deleted.length = 0
    window.caches = { open: () => Promise.resolve({ delete: url => { deleted.push(url); return Promise.resolve(true) } }) }
    localStorage.setItem('offlineStories', JSON.stringify([
        { id: 11, title: 'The Well', author: 'moth', savedAt: '2026-09-28T10:00:00Z' },
    ]))
})

describe('OfflineLibraryPage', () => {
    it('lists the downloaded stories and can remove one', async () => {
        render(<MemoryRouter><OfflineLibraryPage /></MemoryRouter>)
        expect(screen.getByRole('link', { name: /The Well/ })).toHaveAttribute('href', '/stories/11')

        await userEvent.click(screen.getByRole('button', { name: 'Remove The Well' }))
        expect(deleted).toEqual(['http://localhost:8000/api/stories/11/'])
        expect(await screen.findByText('Nothing downloaded yet')).toBeInTheDocument()
    })
})
