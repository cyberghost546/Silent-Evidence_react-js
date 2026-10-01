import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AccountSettings from './AccountSettings'
import { changePassword, deleteAccount } from '../../api/client'


// The Account part of Settings: private profile, password, delete.
// Django is faked (vi.mock) - nothing is really changed or deleted.
const refreshUser = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ refreshUser }),
}))
vi.mock('../../api/client', () => ({
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
    exportMyData: vi.fn(),
    getMyVerification: vi.fn(() => Promise.resolve(null)),
    requestVerification: vi.fn(),
}))

const onSave = vi.fn()
const onMessage = vi.fn()

function renderSettings() {
    render(
        <MemoryRouter initialEntries={['/settings']}>
            <Routes>
                <Route path='/settings' element={<AccountSettings settings={{ is_private: false }} onSave={onSave} onMessage={onMessage} />} />
                <Route path='/' element={<p>Home page</p>} />
            </Routes>
        </MemoryRouter>
    )
}

describe('Account settings', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('the private profile switch saves the new value', async () => {
        renderSettings()
        await userEvent.click(screen.getByRole('switch', { name: 'Private Profile' }))
        expect(onSave).toHaveBeenCalledWith({ is_private: true }, 'Your profile is now private.')
    })

    it('changes the password', async () => {
        changePassword.mockResolvedValue({})
        renderSettings()
        await userEvent.click(screen.getByRole('button', { name: 'Change' }))
        await userEvent.type(screen.getByLabelText('Current password'), 'old-Pass-123')
        await userEvent.type(screen.getByLabelText('New password'), 'n3w-Pass-456!')
        await userEvent.click(screen.getByRole('button', { name: 'Save new password' }))
        expect(changePassword).toHaveBeenCalledWith('old-Pass-123', 'n3w-Pass-456!')
        expect(onMessage).toHaveBeenCalledWith('Password changed.')
    })

    it('shows a wrong current password under its field', async () => {
        changePassword.mockRejectedValue({ data: { current_password: ['Your current password is wrong.'] } })
        renderSettings()
        await userEvent.click(screen.getByRole('button', { name: 'Change' }))
        await userEvent.type(screen.getByLabelText('Current password'), 'nope')
        await userEvent.type(screen.getByLabelText('New password'), 'n3w-Pass-456!')
        await userEvent.click(screen.getByRole('button', { name: 'Save new password' }))
        expect(await screen.findByText('Your current password is wrong.')).toBeInTheDocument()
        expect(onMessage).not.toHaveBeenCalled()
    })

    it('deleting takes two steps and the password', async () => {
        deleteAccount.mockResolvedValue({})
        renderSettings()
        // Step 1 only opens the form - nothing is deleted yet.
        await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
        expect(deleteAccount).not.toHaveBeenCalled()
        expect(screen.getByRole('button', { name: 'Delete forever' })).toBeDisabled()   // no password yet

        await userEvent.type(screen.getByLabelText('Your password'), 'my-Pass-123')
        await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
        expect(deleteAccount).toHaveBeenCalledWith('my-Pass-123')
        expect(await screen.findByText('Home page')).toBeInTheDocument()
        expect(refreshUser).toHaveBeenCalled()
    })

    it('a wrong password does not delete anything', async () => {
        deleteAccount.mockRejectedValue({ data: { password: ['Wrong password.'] } })
        renderSettings()
        await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
        await userEvent.type(screen.getByLabelText('Your password'), 'nope')
        await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
        expect(await screen.findByText('Wrong password.')).toBeInTheDocument()
        expect(screen.queryByText('Home page')).not.toBeInTheDocument()
    })
})
