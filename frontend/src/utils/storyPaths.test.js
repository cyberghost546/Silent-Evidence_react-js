import { describe, it, expect } from 'vitest'
import { isInteractive, parsePaths, stripPathMarks } from './storyPaths'


const STORY = `You stand at the cellar door.
[[choice: Open the door -> cellar]]
[[choice: Run upstairs -> upstairs]]

[[section: cellar]]
The stairs go down too far.

[[section: upstairs]]
You lock the bathroom door.
[[choice: Look in the mirror -> cellar]]`

describe('choose-your-path stories', () => {
    it('knows which stories have paths', () => {
        expect(isInteractive(STORY)).toBe(true)
        expect(isInteractive('A normal story.\n\nWith paragraphs.')).toBe(false)
        expect(isInteractive('She said [[section: x]] in the middle of a line.')).toBe(false)
    })

    it('splits sections and choices', () => {
        const { start, sections, problems } = parsePaths(STORY)
        expect(start).toBe('start')
        expect(sections.start.text).toBe('You stand at the cellar door.')
        expect(sections.start.choices).toEqual([
            { label: 'Open the door', to: 'cellar' },
            { label: 'Run upstairs', to: 'upstairs' },
        ])
        expect(sections.cellar.choices).toEqual([])          // no choices = an ending
        expect(problems).toEqual([])
    })

    it('starts at the first section when there is no intro', () => {
        expect(parsePaths('[[section: hall]]\nDark.\n[[choice: Go -> end]]\n[[section: end]]\nBye.').start).toBe('hall')
    })

    it('points out choices that go nowhere and duplicate names', () => {
        const { problems } = parsePaths('Hi.\n[[choice: Jump -> nowhere]]\n[[section: a]]\nx\n[[section: a]]\ny')
        expect(problems).toContain('In "start", the choice "Jump" goes to "nowhere" - there\'s no section with that name.')
        expect(problems).toContain('There are two sections called "a".')
    })

    it('reads aloud without the marks', () => {
        expect(stripPathMarks(STORY)).not.toMatch(/\[\[/)
    })
})
