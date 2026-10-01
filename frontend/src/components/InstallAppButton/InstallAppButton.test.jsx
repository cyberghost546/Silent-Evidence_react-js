import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InstallAppButton from './InstallAppButton'


// "Install the app". The browser's 'beforeinstallprompt' event is
// faked: we send our own, with a prompt() we can watch.
const realUserAgent = navigator.userAgent

function setUserAgent(value) {
    Object.defineProperty(navigator, 'userAgent', { value, configurable: true })
}

afterEach(() => {
    setUserAgent(realUserAgent)
})

describe('InstallAppButton', () => {
    it('shows nothing where installing is not possible', () => {
        const { container } = render(<InstallAppButton />)
        expect(container).toBeEmptyDOMElement()
    })

    it("opens the browser's install window when it offers one", async () => {
        render(<InstallAppButton />)
        const event = new Event('beforeinstallprompt')
        event.prompt = vi.fn()
        event.userChoice = Promise.resolve({ outcome: 'accepted' })
        act(() => {
            window.dispatchEvent(event)
        })

        await userEvent.click(screen.getByRole('button', { name: 'Install the app' }))
        expect(event.prompt).toHaveBeenCalled()
    })

    it('explains "Add to Home Screen" on an iPhone', async () => {
        setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1')
        render(<InstallAppButton />)
        await userEvent.click(screen.getByRole('button', { name: 'Install the app' }))
        expect(screen.getByText('Add to Home Screen')).toBeInTheDocument()
    })
})
