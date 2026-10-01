import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationSettings from './NotificationSettings'


// ---------------------------------------------------------------
// The notification switches in Settings. This component doesn't
// talk to Django itself - it calls onSave(changes). So instead of
// faking Django, we give it a pretend onSave and check what it got.
// ---------------------------------------------------------------
const SETTINGS = {
    notify_likes: true,
    notify_comments: true,
    notify_follows: false,
    weekly_digest: true,
    comment_digest: 'weekly',
}

describe('NotificationSettings', () => {
    it('shows each switch on or off like the saved settings', () => {
        render(<NotificationSettings settings={SETTINGS} onSave={vi.fn()} />)
        // role='switch' + aria-checked comes from the Toggle component.
        expect(screen.getByRole('switch', { name: 'Likes' })).toHaveAttribute('aria-checked', 'true')
        expect(screen.getByRole('switch', { name: 'New followers' })).toHaveAttribute('aria-checked', 'false')
    })

    it('saves the opposite value when a switch is clicked', async () => {
        const onSave = vi.fn()
        render(<NotificationSettings settings={SETTINGS} onSave={onSave} />)

        await userEvent.click(screen.getByRole('switch', { name: 'Likes' }))
        expect(onSave).toHaveBeenCalledWith({ notify_likes: false }, 'Likes: off.')
    })
})
