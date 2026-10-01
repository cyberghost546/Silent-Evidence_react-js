// Spoilers in comments and forum posts: ||hidden text||.
// Drawn by components/SpoilerText/SpoilerText.jsx.

// 'a ||b|| c' -> [{ spoiler: false, text: 'a ' }, { spoiler: true, text: 'b' }, { spoiler: false, text: ' c' }]
// A plain function (no React), so it's easy to test.
// The ( ) in the pattern make .split() KEEP the ||...|| parts.
// [^|\n]+ = one or more characters that aren't | or a new line, so a
// spoiler can't run across lines, and "||||" isn't an empty spoiler.
export function splitSpoilers(text) {
    return text
        .split(/(\|\|[^|\n]+\|\|)/)
        .filter(piece => piece !== '')
        .map(piece => (piece.startsWith('||') && piece.endsWith('||') && piece.length > 4
            ? { spoiler: true, text: piece.slice(2, -2) }
            : { spoiler: false, text: piece }))
}
