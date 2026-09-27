import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SeriesLabel, SeriesNav } from './SeriesNav'


// ---------------------------------------------------------------
// A "pure" component: it only shows what it's given (no Django, no
// state) - the easiest kind to test. Give props, check the screen.
// ---------------------------------------------------------------
const MIDDLE_PART = {
    id: 1,
    title: 'The Lighthouse Diaries',
    part: 2,
    total: 3,
    previous: { id: 10, title: 'Night one' },
    next: { id: 12, title: 'Night three' },
}

function renderIn(ui) {
    render(<MemoryRouter>{ui}</MemoryRouter>)
}


describe('SeriesNav', () => {
    it('links to the previous and next part', () => {
        renderIn(<SeriesNav series={MIDDLE_PART} />)
        expect(screen.getByRole('link', { name: /Night one/ })).toHaveAttribute('href', '/stories/10')
        expect(screen.getByRole('link', { name: /Night three/ })).toHaveAttribute('href', '/stories/12')
    })

    it('has no "previous" on part 1', () => {
        renderIn(<SeriesNav series={{ ...MIDDLE_PART, part: 1, previous: null }} />)
        expect(screen.queryByRole('link', { name: /Night one/ })).not.toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Night three/ })).toBeInTheDocument()
    })

    it('draws nothing for a story that is not in a series', () => {
        const { container } = render(<MemoryRouter><SeriesNav series={null} /><SeriesLabel series={null} /></MemoryRouter>)
        expect(container).toBeEmptyDOMElement()
    })

    it('the label says which part it is', () => {
        renderIn(<SeriesLabel series={MIDDLE_PART} />)
        expect(screen.getByText(/Part 2 of 3/)).toBeInTheDocument()
    })
})
