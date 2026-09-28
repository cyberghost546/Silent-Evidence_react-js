import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import FearMeter from './FearMeter'
import { rateFear } from '../../api/client'


// The fear meter. Django and "am I logged in?" are faked (vi.mock).
vi.mock('../../api/client', () => ({ rateFear: vi.fn() }))
vi.mock('../../hooks/useRequireLogin', () => ({ useRequireLogin: () => () => true }))

function renderMeter(props = {}) {
    render(
        <MemoryRouter>
            <FearMeter storyId={7} initial={{ average: 3.5, votes: 2, mine: null }} {...props} />
        </MemoryRouter>
    )
}

describe('FearMeter', () => {
    // Braces on purpose - see the note in ResetPassword.test.jsx.
    beforeEach(() => {
        rateFear.mockReset()
    })

    it('shows the average', () => {
        renderMeter()
        expect(screen.getByText('3.5')).toBeInTheDocument()
        expect(screen.getByText(/from 2 readers/)).toBeInTheDocument()
    })

    it('saves a rating and shows the new average', async () => {
        rateFear.mockResolvedValue({ average: 4.0, votes: 3, mine: 5 })
        renderMeter()
        await userEvent.click(screen.getByRole('button', { name: /^5 of 5/ }))

        expect(rateFear).toHaveBeenCalledWith(7, 5)
        expect(await screen.findByText('4')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^5 of 5/ })).toHaveAttribute('aria-pressed', 'true')
    })

    it('has no skull buttons on your own story', () => {
        renderMeter({ canRate: false })
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
})
