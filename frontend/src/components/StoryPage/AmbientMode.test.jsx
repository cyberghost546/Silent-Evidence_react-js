import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AmbientMode from './AmbientMode'


// Ambient mode. The test browser (jsdom) has no real scrolling, so
// this checks the switch, the dark layer and that the choice is saved.
function renderAmbient() {
    const bodyRef = { current: document.createElement('div') }
    return render(<AmbientMode bodyRef={bodyRef} />)
}

describe('AmbientMode', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('is off until the reader switches it on', async () => {
        const { container } = renderAmbient()
        const button = screen.getByRole('button', { name: 'Ambient mode' })
        expect(button).toHaveAttribute('aria-pressed', 'false')
        expect(container.querySelector('.pointer-events-none')).toBeNull()

        await userEvent.click(button)
        expect(button).toHaveAttribute('aria-pressed', 'true')
        // The darkening layer, which lets clicks through to the page.
        expect(container.querySelector('.pointer-events-none')).not.toBeNull()
        expect(localStorage.getItem('ambientMode')).toBe('on')
    })

    it('remembers the choice for the next story', () => {
        localStorage.setItem('ambientMode', 'on')
        renderAmbient()
        expect(screen.getByRole('button', { name: 'Ambient mode' })).toHaveAttribute('aria-pressed', 'true')
    })
})
