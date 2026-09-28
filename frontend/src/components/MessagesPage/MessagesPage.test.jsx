import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MessagesPage from './MessagesPage'
import { getConversations, getConversation, sendMessage } from '../../api/client'


// Private messages. Django is faked (vi.mock).
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

function renderMessages(path) {
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path='/messages' element={<MessagesPage />} />
                <Route path='/messages/:username' element={<MessagesPage />} />
            </Routes>
        </MemoryRouter>
    )
}

describe('MessagesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        getConversations.mockResolvedValue([
            { username: 'moth', avatar: '', unread: 1, last_message: { body: 'Did you hear that?', is_mine: false, created_at: NOW } },
        ])
    })

    it('lists your conversations with the last message', async () => {
        renderMessages('/messages')
        expect(await screen.findByRole('link', { name: /moth/ })).toHaveAttribute('href', '/messages/moth')
        expect(screen.getByText('Did you hear that?')).toBeInTheDocument()
    })

    it('opens a chat and sends a message', async () => {
        getConversation.mockResolvedValue(CHAT)
        sendMessage.mockResolvedValue({ id: 3, body: 'Nothing. Go to sleep.', is_mine: true, created_at: NOW })
        renderMessages('/messages/moth')

        expect(await screen.findByText('Hear what?')).toBeInTheDocument()
        await userEvent.type(screen.getByLabelText('Your message'), 'Nothing. Go to sleep.')
        await userEvent.click(screen.getByRole('button', { name: 'Send' }))

        expect(sendMessage).toHaveBeenCalledWith('moth', 'Nothing. Go to sleep.')
        expect(await screen.findByText('Nothing. Go to sleep.')).toBeInTheDocument()
        expect(screen.getByLabelText('Your message')).toHaveValue('')
    })

    it('no message box when you cannot message this person', async () => {
        getConversation.mockResolvedValue({ ...CHAT, blocked: true })
        renderMessages('/messages/moth')
        expect(await screen.findByText("You can't message this user.")).toBeInTheDocument()
        expect(screen.queryByLabelText('Your message')).not.toBeInTheDocument()
    })

    it('a username that does not exist', async () => {
        getConversation.mockRejectedValue({ status: 404 })
        renderMessages('/messages/nobody')
        expect(await screen.findByText('There\'s nobody called "nobody".')).toBeInTheDocument()
    })
})
