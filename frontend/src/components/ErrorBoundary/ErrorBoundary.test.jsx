import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'
import { sendErrorReport } from '../../api/client'


// ---------------------------------------------------------------
// The safety net: a crashing child should show the friendly screen
// and send the crash to the Error Log.
// ---------------------------------------------------------------
vi.mock('../../api/client', () => ({
    sendErrorReport: vi.fn(() => Promise.resolve()),
}))

// A component that crashes ON PURPOSE.
function Broken() {
    throw new Error('The foghorn broke')
}

describe('ErrorBoundary', () => {
    beforeEach(() => {
        sendErrorReport.mockClear()
        // React prints crashes to the console (good in real life, noisy
        // here) - silence it just for these tests.
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('shows the page normally when nothing breaks', () => {
        render(<ErrorBoundary resetKey='/'><p>All fine</p></ErrorBoundary>)
        expect(screen.getByText('All fine')).toBeInTheDocument()
    })

    it('shows "Something went wrong" and reports the crash', () => {
        render(<ErrorBoundary resetKey='/'><Broken /></ErrorBoundary>)
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        expect(sendErrorReport).toHaveBeenCalledWith('The foghorn broke', expect.any(String), expect.any(String))
    })

    it('tries again when you go to another page', () => {
        const { rerender } = render(<ErrorBoundary resetKey='/broken'><Broken /></ErrorBoundary>)
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()

        rerender(<ErrorBoundary resetKey='/home'><p>Home page</p></ErrorBoundary>)
        expect(screen.getByText('Home page')).toBeInTheDocument()
    })
})
