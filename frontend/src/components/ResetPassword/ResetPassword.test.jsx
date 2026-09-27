import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ForgotPassword from '../ForgotPassword/ForgotPassword'
import ResetPassword from './ResetPassword'
import { requestPasswordReset, confirmPasswordReset } from '../../api/client'


// ---------------------------------------------------------------
// "Forgot password?" - both pages. Django is faked (vi.mock).
// usePageTitle asks Django for the site name, so it's faked too.
// ---------------------------------------------------------------
vi.mock('../../api/client', () => ({
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
}))
vi.mock('../../hooks/usePageTitle', () => ({ usePageTitle: () => {} }))


describe('Forgot password page', () => {
    // { } matter here: without them, the arrow RETURNS the mock, and
    // Vitest runs a function returned from beforeEach as clean-up
    // after the test - it would call our fake by accident.
    beforeEach(() => {
        requestPasswordReset.mockReset()
    })

    it("shows Django's 'check your inbox' message after sending", async () => {
        requestPasswordReset.mockResolvedValue({ detail: 'If an account uses that email, we sent it a link.' })
        render(<MemoryRouter><ForgotPassword /></MemoryRouter>)

        await userEvent.type(screen.getByLabelText('Email address'), 'raven@example.com')
        await userEvent.click(screen.getByRole('button', { name: 'Send me the link' }))

        expect(requestPasswordReset).toHaveBeenCalledWith('raven@example.com')
        expect(await screen.findByText('Check your email')).toBeInTheDocument()
    })

    it('asks for an email first', async () => {
        render(<MemoryRouter><ForgotPassword /></MemoryRouter>)
        await userEvent.click(screen.getByRole('button', { name: 'Send me the link' }))
        expect(screen.getByText('Enter the email address of your account.')).toBeInTheDocument()
        expect(requestPasswordReset).not.toHaveBeenCalled()
    })
})


describe('New password page', () => {
    beforeEach(() => {
        confirmPasswordReset.mockReset()
    })

    // The page reads :uid and :token from the address, like the email link.
    function renderResetPage() {
        render(
            <MemoryRouter initialEntries={['/reset-password/MQ/abc-123']}>
                <Routes>
                    <Route path='/reset-password/:uid/:token' element={<ResetPassword />} />
                </Routes>
            </MemoryRouter>
        )
    }

    it('sends uid, token and the new password', async () => {
        confirmPasswordReset.mockResolvedValue({ detail: 'Changed.' })
        renderResetPage()

        await userEvent.type(screen.getByLabelText('New password'), 'Night-owl-2026!')
        await userEvent.type(screen.getByLabelText('Confirm new password'), 'Night-owl-2026!')
        await userEvent.click(screen.getByRole('button', { name: 'Save new password' }))

        expect(confirmPasswordReset).toHaveBeenCalledWith('MQ', 'abc-123', 'Night-owl-2026!')
        expect(await screen.findByText('Password changed')).toBeInTheDocument()
    })

    it("catches two different passwords before asking Django", async () => {
        renderResetPage()
        await userEvent.type(screen.getByLabelText('New password'), 'Night-owl-2026!')
        await userEvent.type(screen.getByLabelText('Confirm new password'), 'Something-else-1')
        await userEvent.click(screen.getByRole('button', { name: 'Save new password' }))

        expect(screen.getByText("The two passwords don't match.")).toBeInTheDocument()
        expect(confirmPasswordReset).not.toHaveBeenCalled()
    })

    it('offers a new link when the old one is used up', async () => {
        confirmPasswordReset.mockRejectedValue({ data: { detail: 'This link is not valid any more. Ask for a new one.' } })
        renderResetPage()
        await userEvent.type(screen.getByLabelText('New password'), 'Night-owl-2026!')
        await userEvent.type(screen.getByLabelText('Confirm new password'), 'Night-owl-2026!')
        await userEvent.click(screen.getByRole('button', { name: 'Save new password' }))

        expect(await screen.findByRole('link', { name: 'Get a new link' })).toHaveAttribute('href', '/forgot-password')
    })
})
