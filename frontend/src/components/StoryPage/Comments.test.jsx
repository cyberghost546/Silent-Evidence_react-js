import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Comments from './Comments'
import { getComments, postComment } from '../../api/client'


// ---------------------------------------------------------------
// Comments under a story. Django is faked: vi.mock replaces
// api/client.js with pretend functions, and each test decides what
// they answer. `user` decides if we're logged in.
// ---------------------------------------------------------------
let user = null
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user }),
}))
vi.mock('../../api/client', () => ({
    getComments: vi.fn(),
    postComment: vi.fn(),
    reportContent: vi.fn(),
}))

const OLD_COMMENT = { id: 1, author: 'moth', body: 'The ending got me.', created_at: '2026-09-20T10:00:00Z' }

function renderComments() {
    render(
        <MemoryRouter>
            <Comments storyId={7} />
        </MemoryRouter>
    )
}


describe('Comments', () => {
    beforeEach(() => {
        user = { username: 'raven' }
        getComments.mockResolvedValue([OLD_COMMENT])
        postComment.mockReset()
    })

    it('shows the comments from Django', async () => {
        renderComments()
        expect(await screen.findByText('The ending got me.')).toBeInTheDocument()
        expect(getComments).toHaveBeenCalledWith(7)
    })

    it('adds your new comment at the top after posting', async () => {
        postComment.mockResolvedValue({ id: 2, author: 'raven', body: 'Chills!', created_at: '2026-09-27T10:00:00Z' })
        renderComments()
        await screen.findByText('The ending got me.')

        await userEvent.type(screen.getByLabelText('Write a comment'), 'Chills!')
        await userEvent.click(screen.getByRole('button', { name: 'Post Comment' }))

        expect(postComment).toHaveBeenCalledWith(7, 'Chills!')
        expect(await screen.findByText('Chills!')).toBeInTheDocument()
        // The box is emptied for the next comment.
        expect(screen.getByLabelText('Write a comment')).toHaveValue('')
    })

    it("shows Django's message when you post too much (rate limit)", async () => {
        postComment.mockRejectedValue({ data: { detail: 'You can post up to 30 comments an hour. Take a breather!' } })
        renderComments()

        await userEvent.type(screen.getByLabelText('Write a comment'), 'One more')
        await userEvent.click(screen.getByRole('button', { name: 'Post Comment' }))

        expect(await screen.findByText('You can post up to 30 comments an hour. Take a breather!')).toBeInTheDocument()
    })

    it("can't post an empty comment", () => {
        renderComments()
        expect(screen.getByRole('button', { name: 'Post Comment' })).toBeDisabled()
    })

    it('shows replies under the comment they answer', async () => {
        getComments.mockResolvedValue([
            { id: 5, author: 'owl', body: 'Same here!', created_at: '2026-09-21T10:00:00Z', parent: 1 },
            { ...OLD_COMMENT, parent: null },
        ])
        renderComments()
        const reply = await screen.findByText('Same here!')
        // The reply is INSIDE the first comment's list item.
        const topItem = screen.getByText('The ending got me.').closest('li')
        expect(topItem).toContainElement(reply)
    })

    it('sends a reply with the id of the comment it answers', async () => {
        getComments.mockResolvedValue([{ ...OLD_COMMENT, parent: null }])
        postComment.mockResolvedValue({ id: 6, author: 'raven', body: 'Agreed', created_at: '2026-09-27T10:00:00Z', parent: 1 })
        renderComments()

        await userEvent.click(await screen.findByRole('button', { name: 'Reply' }))
        await userEvent.type(screen.getByLabelText('Reply to moth'), 'Agreed')
        await userEvent.click(screen.getByRole('button', { name: 'Reply' }))

        expect(postComment).toHaveBeenCalledWith(7, 'Agreed', 1)
        expect(await screen.findByText('Agreed')).toBeInTheDocument()
    })

    it('asks visitors to log in instead of showing the form', async () => {
        user = null
        renderComments()
        expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
        expect(screen.queryByLabelText('Write a comment')).not.toBeInTheDocument()
    })
})
