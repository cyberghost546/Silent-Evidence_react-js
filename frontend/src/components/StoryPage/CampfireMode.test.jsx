import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CampfireMode from './CampfireMode'
import { startAmbient } from '../../utils/ambientSound'


// ---------------------------------------------------------------
// Campfire mode. The test browser (jsdom) has no speakers and no
// Web Audio - so we fake a tiny AudioContext, and fake startAmbient
// to check WHAT would play, without making sound.
// ---------------------------------------------------------------
vi.mock('../../utils/ambientSound', () => ({
    AMBIENT_SOUNDS: [
        { value: 'rain', label: 'Rain', emoji: '🌧️' },
        { value: 'fire', label: 'Fire', emoji: '🔥' },
    ],
    startAmbient: vi.fn(() => ({ stop: vi.fn() })),
}))

class FakeAudioContext {
    createGain() {
        return { gain: { value: 1 }, connect() {} }
    }
    close() {}
}


describe('CampfireMode', () => {
    beforeEach(() => {
        localStorage.clear()
        startAmbient.mockClear()
        window.AudioContext = FakeAudioContext
    })
    afterEach(() => {
        delete window.AudioContext
    })

    it('stays quiet until you click it', () => {
        render(<CampfireMode />)
        expect(startAmbient).not.toHaveBeenCalled()
    })

    it('plays the chosen sound and remembers the choice', async () => {
        render(<CampfireMode />)
        await userEvent.click(screen.getByRole('button', { name: /Fire/ }))
        await userEvent.click(screen.getByRole('button', { name: 'Campfire mode' }))

        expect(startAmbient).toHaveBeenCalledWith(expect.any(FakeAudioContext), 'fire', expect.anything())
        expect(localStorage.getItem('campfireSound')).toBe('fire')
        expect(screen.getByRole('button', { name: 'Campfire mode: on' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('explains itself in a browser without Web Audio', () => {
        delete window.AudioContext
        render(<CampfireMode />)
        expect(screen.getByText('Campfire mode needs a newer browser.')).toBeInTheDocument()
    })
})
