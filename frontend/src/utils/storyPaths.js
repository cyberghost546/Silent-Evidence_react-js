// ---------------------------------------------------------------
// CHOOSE-YOUR-PATH STORIES
//
// A writer splits the story into SECTIONS and adds CHOICES, each on
// its own line (the Write page has buttons that type them):
//
//   You stand at the cellar door. Something scratches below.
//   [[choice: Open the door -> cellar]]
//   [[choice: Run upstairs -> upstairs]]
//
//   [[section: cellar]]
//   The stairs go down further than the house is tall...
//
//   [[section: upstairs]]
//   You lock yourself in the bathroom. The scratching follows.
//
// Text before the first [[section: ...]] is where the story starts.
// A section with no choices is an ENDING.
//
// Plain functions, no React - StoryBody and the Write page's preview
// both use them.
// ---------------------------------------------------------------
const SECTION_LINE = /^\[\[section:\s*([a-z0-9-]+)\s*\]\]$/i
const CHOICE_LINE = /^\[\[choice:\s*(.+?)\s*->\s*([a-z0-9-]+)\s*\]\]$/i

export const START = 'start'

// Is this a choose-your-path story at all?
export function isInteractive(text) {
    return /^\s*\[\[section:\s*[a-z0-9-]+\s*\]\]\s*$/im.test(text)
}

// Text -> { start, sections: { name: { text, choices: [{ label, to }] } }, problems: ['...'] }
export function parsePaths(text) {
    const sections = {}
    const problems = []
    let current = START
    sections[START] = { text: '', choices: [] }

    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim()
        const section = line.match(SECTION_LINE)
        const choice = line.match(CHOICE_LINE)

        if (section) {
            current = section[1].toLowerCase()
            if (sections[current] && current !== START) problems.push(`There are two sections called "${current}".`)
            sections[current] = sections[current] || { text: '', choices: [] }
        } else if (choice) {
            sections[current].choices.push({ label: choice[1], to: choice[2].toLowerCase() })
        } else {
            sections[current].text += rawLine + '\n'
        }
    }

    // No text before the first section -> the story starts at the first section.
    let start = START
    if (!sections[START].text.trim() && sections[START].choices.length === 0) {
        delete sections[START]
        start = Object.keys(sections)[0]
    }

    for (const [name, section] of Object.entries(sections)) {
        section.text = section.text.trim()
        for (const choice of section.choices) {
            if (!sections[choice.to]) problems.push(`In "${name}", the choice "${choice.label}" goes to "${choice.to}" - there's no section with that name.`)
        }
    }

    return { start, sections, problems }
}

// For Listen / word counts: the story without the [[...]] marks.
export function stripPathMarks(text) {
    return text.replace(/^\s*\[\[(section|choice):[^\]]*\]\]\s*$/gim, '')
}
