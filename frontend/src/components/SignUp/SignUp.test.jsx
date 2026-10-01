import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SignUp from './SignUp'


// The Sign Up page. useAuth() and the site status are faked
// (vi.mock) - see LogIn.test.jsx for how that works.
const signup = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ signup }),
}))
let site = { signups_open: true }
vi.mock('../../hooks/useSiteStatus', () => ({
    useSiteStatus: () => site,
}))

function renderSignUp() {
    render(
        <MemoryRouter initialEntries={['/signup']}>
            <Routes>
                <Route path='/signup' element={<SignUp />} />
                <Route path='/' element={<p>Home page</p>} />
            </Routes>
        </MemoryRouter>
    )
}

async function fillIn({ password2 = 'Str0ng-pass-123' } = {}) {
    await userEvent.type(screen.getByLabelText('Username'), 'raven')
    await userEvent.type(screen.getByLabelText('Email'), 'raven@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng-pass-123')
    await userEvent.type(screen.getByLabelText('Confirm Password'), password2)
}

describe('Sign Up page', () => {
    beforeEach(() => {
        signup.mockReset()
        site = { signups_open: true }
    })

    it('creates the account and goes home', async () => {
        signup.mockResolvedValue({})
        renderSignUp()
        await fillIn()
        await userEvent.click(screen.getByRole('button', { name: /create account|sign up/i }))
        expect(signup).toHaveBeenCalledWith('raven', 'raven@example.com', 'Str0ng-pass-123')
        expect(await screen.findByText('Home page')).toBeInTheDocument()
    })

    it('catches mistyped passwords without asking Django', async () => {
        renderSignUp()
        await fillIn({ password2: 'something-else' })
        await userEvent.click(screen.getByRole('button', { name: /create account|sign up/i }))
        expect(screen.getByText('The passwords do not match.')).toBeInTheDocument()
        expect(signup).not.toHaveBeenCalled()
    })

    it("shows Django's message under the right field", async () => {
        signup.mockRejectedValue({ data: { username: ['That username is reserved.'] } })
        renderSignUp()
        await fillIn()
        await userEvent.click(screen.getByRole('button', { name: /create account|sign up/i }))
        expect(await screen.findByText('That username is reserved.')).toBeInTheDocument()
        expect(screen.queryByText('Home page')).not.toBeInTheDocument()
    })

    it('shows a notice instead of the form when sign-ups are closed', () => {
        site = { signups_open: false }
        renderSignUp()
        expect(screen.getByText('Sign-ups are closed right now.')).toBeInTheDocument()
        expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
    })
})
