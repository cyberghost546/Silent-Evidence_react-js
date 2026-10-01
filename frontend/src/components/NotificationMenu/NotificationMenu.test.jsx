import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import NotificationMenu from './NotificationMenu'
import { getNotifications, markNotificationsRead } from '../../api/client'


// ---------------------------------------------------------------
// The bell in the header. Django is faked (vi.mock) - see
// Comments.test.jsx for how that works.
// ---------------------------------------------------------------
vi.mock('../../api/client', () => ({
    getNotifications: vi.fn(),
    markNotificationsRead: vi.fn(),
}))

const NOW = new Date().toISOString()
const DATA = {
    unread: 2,
    items: [
        { id: 1, kind: 'like', text: 'raven liked your story "Fog"', link: '/stories/3', is_read: false, created_at: NOW },
        { id: 2, kind: 'follow', text: 'moth started following you', link: '/profile/moth', is_read: false, created_at: NOW },
        { id: 3, kind: 'comment', text: 'owl commented on "Fog"', link: '/stories/3', is_read: true, created_at: NOW },
    ],
}

function renderBell() {
    render(<MemoryRouter><NotificationMenu /></MemoryRouter>)
}


describe('NotificationMenu', () => {
    beforeEach(() => {
        getNotifications.mockResolvedValue(DATA)
        markNotificationsRead.mockReset()
        markNotificationsRead.mockResolvedValue({ unread: 0 })
    })

    it('shows the unread count on the bell', async () => {
        renderBell()
        // The count is in the button's name, for screen readers too.
        expect(await screen.findByRole('button', { name: 'Notifications (2 unread)' })).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('opens the list when the bell is clicked', async () => {
        renderBell()
        await userEvent.click(await screen.findByRole('button', { name: 'Notifications (2 unread)' }))
        expect(screen.getByText('raven liked your story "Fog"')).toBeInTheDocument()
        expect(screen.getByText('owl commented on "Fog"')).toBeInTheDocument()
    })

    it('"Mark all as read" clears the badge and tells Django', async () => {
        renderBell()
        await userEvent.click(await screen.findByRole('button', { name: 'Notifications (2 unread)' }))
        await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))

        expect(markNotificationsRead).toHaveBeenCalledWith()
        expect(screen.getByRole('button', { name: 'Notifications (0 unread)' })).toBeInTheDocument()
    })
})
