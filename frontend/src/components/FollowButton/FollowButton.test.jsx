import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import FollowButton from './FollowButton'
import { followAuthor } from '../../api/client'


// ---------------------------------------------------------------
// The Follow button. Django is faked (vi.mock) - see Comments.test.jsx
// for how that works. `user` is changed by each test.
// ---------------------------------------------------------------
let user = null
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user }),
}))
vi.mock('../../api/client', () => ({
    followAuthor: vi.fn(),
}))

function renderButton(props) {
    render(
        <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path='/' element={<FollowButton username='raven' {...props} />} />
                <Route path='/login' element={<p>Log In page</p>} />
            </Routes>
        </MemoryRouter>
    )
}


describe('FollowButton', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        user = { username: 'christopher' }
    })

    it('follows, then unfollows, and tells the parent', async () => {
        const onChange = vi.fn()
        followAuthor.mockResolvedValueOnce({ following: true, follower_count: 4 })
        followAuthor.mockResolvedValueOnce({ following: false, follower_count: 3 })
        renderButton({ onChange })

        await userEvent.click(screen.getByRole('button', { name: 'Follow raven' }))
        expect(followAuthor).toHaveBeenCalledWith('raven')
        expect(await screen.findByRole('button', { name: 'Unfollow raven' })).toHaveTextContent('Following')
        expect(onChange).toHaveBeenCalledWith({ following: true, follower_count: 4 })

        await userEvent.click(screen.getByRole('button', { name: 'Unfollow raven' }))
        expect(await screen.findByRole('button', { name: 'Follow raven' })).toHaveTextContent('Follow')
    })

    it('starts as "Following" when you already follow them', () => {
        renderButton({ following: true })
        expect(screen.getByRole('button', { name: 'Unfollow raven' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('is not shown on your own name', () => {
        user = { username: 'raven' }
        renderButton()
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('sends you to Log In when you are logged out', async () => {
        user = null
        renderButton()
        await userEvent.click(screen.getByRole('button', { name: 'Follow raven' }))
        expect(screen.getByText('Log In page')).toBeInTheDocument()
        expect(followAuthor).not.toHaveBeenCalled()
    })
})
