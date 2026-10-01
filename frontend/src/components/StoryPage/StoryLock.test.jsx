import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import StoryLock from './StoryLock'
import { confirmAge } from '../../api/client'


// ---------------------------------------------------------------
// The lock screen on 18+ stories. Django is faked (vi.mock).
// ---------------------------------------------------------------
const refreshUser = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ refreshUser }),
}))
vi.mock('../../api/client', () => ({
    confirmAge: vi.fn(),
}))

function renderLock(lock, onUnlocked = vi.fn()) {
    render(<MemoryRouter><StoryLock lock={lock} onUnlocked={onUnlocked} /></MemoryRouter>)
    return onUnlocked
}

// Pick 23 April 1998 in the three dropdowns.
async function pickBirthDate() {
    await userEvent.selectOptions(screen.getByLabelText('Month'), 'April')
    await userEvent.selectOptions(screen.getByLabelText('Day'), '23')
    await userEvent.selectOptions(screen.getByLabelText('Year'), '1998')
}


describe('StoryLock', () => {
    beforeEach(() => {
        confirmAge.mockReset()
        refreshUser.mockReset()
    })

    it('asks visitors to log in', () => {
        renderLock('login')
        expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
        expect(screen.queryByLabelText('Year')).not.toBeInTheDocument()
    })

    it('sends the birth date and opens the story for adults', async () => {
        confirmAge.mockResolvedValue({ age_confirmed: true, is_adult: true })
        const onUnlocked = renderLock('age')

        await pickBirthDate()
        await userEvent.click(screen.getByRole('button', { name: 'Confirm my age' }))

        // Month 3 (April, counting from 0) + 1 = '04' for Django.
        expect(confirmAge).toHaveBeenCalledWith('1998-04-23')
        expect(onUnlocked).toHaveBeenCalled()
        expect(refreshUser).toHaveBeenCalled()
    })

    it('says sorry to under-18s and keeps the story closed', async () => {
        confirmAge.mockResolvedValue({ age_confirmed: true, is_adult: false })
        const onUnlocked = renderLock('age')

        await pickBirthDate()
        await userEvent.click(screen.getByRole('button', { name: 'Confirm my age' }))

        expect(await screen.findByText(/lots of stories for you/)).toBeInTheDocument()
        expect(onUnlocked).not.toHaveBeenCalled()
    })

    it('catches a date that does not exist before asking Django', async () => {
        renderLock('age')
        await userEvent.selectOptions(screen.getByLabelText('Month'), 'February')
        await userEvent.selectOptions(screen.getByLabelText('Day'), '31')
        await userEvent.selectOptions(screen.getByLabelText('Year'), '1998')
        await userEvent.click(screen.getByRole('button', { name: 'Confirm my age' }))

        expect(screen.getByText('That date does not exist.')).toBeInTheDocument()
        expect(confirmAge).not.toHaveBeenCalled()
    })
})
