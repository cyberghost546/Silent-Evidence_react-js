import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'


// ProtectedRoute guards pages like /settings and /dashboard. These
// tests fake who is logged in (vi.mock) and check who gets through.
let auth = {}
vi.mock('../hooks/useAuth', () => ({
    useAuth: () => auth,
}))

// The Log In page in the test shows where it was sent FROM, so we
// can check "come back here after logging in" works.
function FakeLogIn() {
    const location = useLocation()
    return <p>Log In page (from {location.state?.from})</p>
}

function renderAt(path, adminOnly = false) {
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path='/secret' element={<ProtectedRoute adminOnly={adminOnly}><p>Secret page</p></ProtectedRoute>} />
                <Route path='/login' element={<FakeLogIn />} />
            </Routes>
        </MemoryRouter>
    )
}

describe('ProtectedRoute', () => {
    it('waits while it is still checking who you are', () => {
        auth = { user: null, loading: true }
        renderAt('/secret')
        expect(screen.getByText('Loading...')).toBeInTheDocument()
        expect(screen.queryByText('Secret page')).not.toBeInTheDocument()
    })

    it('sends visitors to Log In, remembering the page', () => {
        auth = { user: null, loading: false }
        renderAt('/secret')
        expect(screen.getByText('Log In page (from /secret)')).toBeInTheDocument()
    })

    it('lets members in', () => {
        auth = { user: { username: 'raven', is_staff: false }, loading: false }
        renderAt('/secret')
        expect(screen.getByText('Secret page')).toBeInTheDocument()
    })

    it('keeps members out of admin-only pages', () => {
        auth = { user: { username: 'raven', is_staff: false }, loading: false }
        renderAt('/secret', true)
        expect(screen.getByText('Only admins can see this page.')).toBeInTheDocument()
        expect(screen.queryByText('Secret page')).not.toBeInTheDocument()
    })

    it('lets admins into admin-only pages', () => {
        auth = { user: { username: 'boss', is_staff: true }, loading: false }
        renderAt('/secret', true)
        expect(screen.getByText('Secret page')).toBeInTheDocument()
    })
})
