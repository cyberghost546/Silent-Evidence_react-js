import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MaintenanceGate from './MaintenanceGate'


// ---------------------------------------------------------------
// The maintenance / blocked screens. We fake the two hooks it uses:
// who is logged in (useAuth) and the site switches (useSiteStatus).
// ---------------------------------------------------------------
let user = null
let site = null
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user }),
}))
vi.mock('../../hooks/useSiteStatus', () => ({
    useSiteStatus: () => site,
}))

function renderGate(path = '/') {
    render(
        <MemoryRouter initialEntries={[path]}>
            <MaintenanceGate>
                <p>The real site</p>
            </MaintenanceGate>
        </MemoryRouter>
    )
}


describe('MaintenanceGate', () => {
    beforeEach(() => {
        user = null
        site = { maintenance_mode: true, maintenance_message: 'Back at 5' }
    })

    it('shows the site normally when maintenance is off', () => {
        site = { maintenance_mode: false }
        renderGate()
        expect(screen.getByText('The real site')).toBeInTheDocument()
    })

    it('shows the maintenance screen to visitors', () => {
        renderGate()
        expect(screen.getByText('Down for maintenance')).toBeInTheDocument()
        expect(screen.getByText('Back at 5')).toBeInTheDocument()
        expect(screen.queryByText('The real site')).not.toBeInTheDocument()
    })

    it('lets admins through', () => {
        user = { username: 'boss', is_staff: true }
        renderGate()
        expect(screen.getByText('The real site')).toBeInTheDocument()
    })

    it('keeps the Log In page open, so admins can log in', () => {
        renderGate('/login')
        expect(screen.getByText('The real site')).toBeInTheDocument()
    })

    it('shows the blocked screen for a blocked IP', () => {
        site = { blocked: true }
        renderGate()
        expect(screen.getByText('Access blocked')).toBeInTheDocument()
    })
})
