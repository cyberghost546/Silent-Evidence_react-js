// ---------------------------------------------------------------
// STORY FORMATTING
//
// Stories are saved as plain text. The toolbar on the Write a Story
// page adds a few simple marks (the same ones Markdown uses):
//
//   **bold**      *italic*      __underline__
//   ## Heading    ### Small heading
//   - list item   1. numbered item
//   > quote       ---  (a divider line)
//   !!scare       (a jump scare comes next - see JUMP_SCARE_MARK)
//
// parseStory() turns that text into a list of "blocks" that
// StoryBody.jsx draws. We NEVER turn the text into HTML - anyone can
// write a story, and HTML would let them sneak a <script> in.
//
// Plain functions, no React - so any file can import them.
// ---------------------------------------------------------------


// ---------------------------------------------------------------
// JUMP SCARES: a writer puts this on its own line right before the
// scary moment (the "Jump scare" button on the Write page does it).
// Readers who asked for warnings see a small warning there; for
// everyone else it's invisible. It's never read out loud.
// ---------------------------------------------------------------
export const JUMP_SCARE_MARK = '!!scare'

// How many jump-scare marks a story has.
export function countScares(text) {
    return text.split('\n').filter(line => line.trim().toLowerCase() === JUMP_SCARE_MARK).length
}


// Turns the story text into blocks like:
//   { type: 'paragraph', text: 'It was dark...' }
//   { type: 'h2', text: 'Chapter One' }
//   { type: 'list', ordered: false, items: ['one', 'two'] }
//   { type: 'quote', text: '...' }
//   { type: 'hr' }
//   { type: 'scare' }
export function parseStory(text) {
    const blocks = []
    const lines = text.split('\n')

    // The block we're still adding lines to (a paragraph, list or
    // quote can go over several lines). null = nothing open.
    let current = null

    // "Close" the open block: put it in the list and start fresh.
    function finish() {
        if (current) blocks.push(current)
        current = null
    }

    for (const rawLine of lines) {
        const line = rawLine.trim()

        // A blank line always ends whatever block was open.
        if (line === '') {
            finish()
            continue
        }

        // Headings: "## " = big, "### " = small. .slice(4) cuts off
        // the first 4 characters ("### ") and keeps the rest.
        if (line.startsWith('### ')) {
            finish()
            blocks.push({ type: 'h3', text: line.slice(4) })
            continue
        }

        if (line.startsWith('## ')) {
            finish()
            blocks.push({ type: 'h2', text: line.slice(3) })
            continue
        }

        if (line === '---') {
            finish()
            blocks.push({ type: 'hr' })
            continue
        }

        // A jump-scare mark on its own line (see JUMP_SCARE_MARK).
        if (line.toLowerCase() === JUMP_SCARE_MARK) {
            finish()
            blocks.push({ type: 'scare' })
            continue
        }

        // /^\d+\. / = "starts with a number, a dot and a space".
        const isBullet = line.startsWith('- ')
        const isNumbered = /^\d+\. /.test(line)

        if (isBullet || isNumbered) {
            // Remove the "- " or "1. " from the front.
            const item = isBullet ? line.slice(2) : line.replace(/^\d+\. /, '')

            // Keep adding to the same list if the last line was the
            // same kind of list. Otherwise start a new one.
            if (current && current.type === 'list' && current.ordered === isNumbered) {
                current.items.push(item)
            } else {
                finish()
                current = { type: 'list', ordered: isNumbered, items: [item] }
            }
            continue
        }

        if (line.startsWith('> ')) {
            if (current && current.type === 'quote') {
                current.text += '\n' + line.slice(2)
            } else {
                finish()
                current = { type: 'quote', text: line.slice(2) }
            }
            continue
        }

        // Anything else is normal text. Lines right under each other
        // (no blank line between) stay in the same paragraph.
        if (current && current.type === 'paragraph') {
            current.text += '\n' + line
        } else {
            finish()
            current = { type: 'paragraph', text: line }
        }
    }

    // The last block has no blank line after it - close it too.
    finish()
    return blocks
}


// Splits one line of text into pieces for bold / italic / underline:
//   'a **big** cat' -> [
//       { style: 'normal', text: 'a ' },
//       { style: 'bold', text: 'big' },
//       { style: 'normal', text: ' cat' },
//   ]
//
// The regular expression finds **...**, __...__ or *...*. Because it
// is inside ( ), .split() KEEPS the matches in the result instead of
// throwing them away.
const INLINE_MARKS = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*)/

export function parseInline(text) {
    return text
        .split(INLINE_MARKS)
        .filter(piece => piece !== '')
        .map(piece => {
            if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 4) {
                return { style: 'bold', text: piece.slice(2, -2) }
            }
            if (piece.startsWith('__') && piece.endsWith('__') && piece.length > 4) {
                return { style: 'underline', text: piece.slice(2, -2) }
            }
            if (piece.startsWith('*') && piece.endsWith('*') && piece.length > 2) {
                return { style: 'italic', text: piece.slice(1, -1) }
            }
            return { style: 'normal', text: piece }
        })
}


// Removes all the marks - for "Listen" (text to speech), so the
// voice doesn't read out "star star".
export function stripFormatting(text) {
    return text
        .replace(/^#{2,3} /gm, '')      // headings
        .replace(/^> /gm, '')           // quotes
        .replace(/^- /gm, '')           // bullet lists
        .replace(/^---$/gm, '')         // divider lines
        .replace(/^\s*!!scare\s*$/gim, '') // jump-scare marks
        .replace(/^\s*\[\[(section|choice):[^\]]*\]\]\s*$/gim, '') // choose-your-path marks
        .replace(/\*\*|__|\*/g, '')     // bold, underline, italic
}


// How many words? .trim() removes spaces at the ends, and /\s+/
// splits on any run of spaces, tabs or new lines. An empty box
// would give [''] (1 "word"), so that case returns 0 by hand.
export function countWords(text) {
    // Jump-scare and choose-your-path marks aren't words the reader
    // sees - leave them out.
    const trimmed = text
        .replace(/^\s*!!scare\s*$/gim, '')
        .replace(/^\s*\[\[(section|choice):[^\]]*\]\]\s*$/gim, '')
        .trim()
    if (trimmed === '') return 0
    return trimmed.split(/\s+/).length
}
