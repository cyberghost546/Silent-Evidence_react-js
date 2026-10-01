import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JumpScareNotice from './JumpScareNotice'
import { useScareWarnings } from '../../hooks/useScareWarnings'
import StoryBody from './StoryBody'


// The notice + StoryBody together, the way StoryPage uses them.
function Story({ body }) {
    const [warn, setWarn] = useScareWarnings()
    return (
        <>
            <JumpScareNotice count={1} warn={warn} onChange={setWarn} />
            <StoryBody body={body} showScares={warn} />
        </>
    )
}

describe('Jump-scare warnings', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('are hidden until the reader asks for them, then remembered', async () => {
        render(<Story body={'Quiet.\n\n!!scare\n\nBOO.'} />)
        expect(screen.getByText('This story has 1 jump scare.')).toBeInTheDocument()
        expect(screen.queryByText('Jump scare ahead')).not.toBeInTheDocument()

        await userEvent.click(screen.getByLabelText('Warn me before each one'))
        expect(screen.getByRole('note')).toHaveTextContent('Jump scare ahead')
        expect(localStorage.getItem('scareWarnings')).toBe('on')
    })

    it('shows nothing for a story without marks', () => {
        const { container } = render(<JumpScareNotice count={0} warn={false} onChange={() => {}} />)
        expect(container).toBeEmptyDOMElement()
    })
})
