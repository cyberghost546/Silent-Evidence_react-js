import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LogIn from './LogIn'


// ---------------------------------------------------------------
// A COMPONENT TEST: render the real Log In page, type like a user,
// click, and check what's on screen.
//
// We don't want a real Django here, so useAuth() is replaced with
// a fake ("mock"): vi.mock swaps the whole file for our version.
// `login` is a vi.fn() - a pretend function we control and can
// ask afterwards "were you called? with what?".
// ---------------------------------------------------------------
const login = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ login }),
}))


// MemoryRouter = React Router without a real address bar. The '/'
// route shows "Home page", so we can check that login moved us there.
function renderLogIn() {
    render(
        <MemoryRouter initialEntries={['/login']}>
            <Routes>
                <Route path='/login' element={<LogIn />} />
                <Route path='/' element={<p>Home page</p>} />
            </Routes>
        </MemoryRouter>
    )
}


describe('Log In page', () => {
    beforeEach(() => {
        login.mockReset()
    })

    it('asks you to fill in both boxes first', async () => {
        renderLogIn()
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(screen.getByText('Please fill in your email (or username) and password.')).toBeInTheDocument()
        expect(login).not.toHaveBeenCalled()
    })

    it("shows Django's message when the password is wrong", async () => {
        // mockRejectedValue = "when called, fail with this error" -
        // shaped like the errors authRequest() throws (err.data.detail).
        login.mockRejectedValue({ data: { detail: 'Wrong email, username or password.' } })
        renderLogIn()

        await userEvent.type(screen.getByLabelText('Email or username'), 'raven')
        await userEvent.type(screen.getByLabelText('Password'), 'not-it')
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(login).toHaveBeenCalledWith('raven', 'not-it')
        expect(await screen.findByText('Wrong email, username or password.')).toBeInTheDocument()
    })

    it('goes to the homepage after a good login', async () => {
        login.mockResolvedValue({ username: 'raven' })
        renderLogIn()

        await userEvent.type(screen.getByLabelText('Email or username'), 'raven')
        await userEvent.type(screen.getByLabelText('Password'), 'Str0ng-pass-123')
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        // findBy... waits a moment - the page changes after login() finishes.
        expect(await screen.findByText('Home page')).toBeInTheDocument()
    })
})
