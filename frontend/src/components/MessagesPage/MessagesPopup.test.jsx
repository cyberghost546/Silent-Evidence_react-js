import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MessagesPopup from './MessagesPopup'
import { getConversations, getConversation, sendMessage } from '../../api/client'


// The Messages pop-up. Django is faked (vi.mock).
vi.mock('../../api/client', async importOriginal => ({
    ...(await importOriginal()),
    getConversations: vi.fn(),
    getConversation: vi.fn(),
    sendMessage: vi.fn(),
}))

const NOW = '2026-09-28T12:00:00Z'
const CHAT = {
    username: 'moth', avatar: '', blocked: false,
    messages: [
        { id: 1, body: 'Did you hear that?', is_mine: false, created_at: NOW },
        { id: 2, body: 'Hear what?', is_mine: true, created_at: NOW },
    ],
}

// MemoryRouter: the chat's name links to the profile page, and a
// <Link> needs a router around it.
function renderPopup(startWith = '', onClose = vi.fn()) {
    render(
        <MemoryRouter>
            <MessagesPopup startWith={startWith} onClose={onClose} />
        </MemoryRouter>
    )
    return onClose
}

describe('MessagesPopup', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        getConversations.mockResolvedValue([
            { username: 'moth', avatar: '', unread: 1, last_message: { body: 'Did you hear that?', is_mine: false, created_at: NOW } },
        ])
    })

    it('lists your conversations, and tapping one opens the chat', async () => {
        getConversation.mockResolvedValue(CHAT)
        renderPopup()

        expect(await screen.findByText('Did you hear that?')).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: /moth/ }))

        expect(await screen.findByText('Hear what?')).toBeInTheDocument()
        expect(getConversation).toHaveBeenCalledWith('moth')
    })

    it('opens straight into a chat and sends a message', async () => {
        getConversation.mockResolvedValue(CHAT)
        sendMessage.mockResolvedValue({ id: 3, body: 'Nothing. Go to sleep.', is_mine: true, created_at: NOW })
        renderPopup('moth')

        expect(await screen.findByText('Hear what?')).toBeInTheDocument()
        await userEvent.type(screen.getByLabelText('Your message'), 'Nothing. Go to sleep.')
        await userEvent.click(screen.getByRole('button', { name: 'Send' }))

        expect(sendMessage).toHaveBeenCalledWith('moth', 'Nothing. Go to sleep.')
        expect(await screen.findByText('Nothing. Go to sleep.')).toBeInTheDocument()
        expect(screen.getByLabelText('Your message')).toHaveValue('')
    })

    it('the back arrow goes to the list, the X closes the pop-up', async () => {
        getConversation.mockResolvedValue(CHAT)
        const onClose = renderPopup('moth')

        await userEvent.click(await screen.findByRole('button', { name: 'Back to conversations' }))
        expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Close messages' }))
        expect(onClose).toHaveBeenCalled()
    })

    it('no message box when you cannot message this person', async () => {
        getConversation.mockResolvedValue({ ...CHAT, blocked: true })
        renderPopup('moth')
        expect(await screen.findByText("You can't message this user.")).toBeInTheDocument()
        expect(screen.queryByLabelText('Your message')).not.toBeInTheDocument()
    })

    it('a username that does not exist', async () => {
        getConversation.mockRejectedValue({ status: 404 })
        renderPopup('nobody')
        expect(await screen.findByText('There\'s nobody called "nobody".')).toBeInTheDocument()
    })
})
