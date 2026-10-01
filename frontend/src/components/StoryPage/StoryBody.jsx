import { TriangleAlert } from 'lucide-react'
import { parseStory, parseInline } from '../../utils/storyFormat'
import { isInteractive } from '../../utils/storyPaths'
import InteractiveStory from './InteractiveStory'


// The text sizes the reader can pick (ReadingToolbar), as Tailwind
// classes. leading-* = line height - bigger text needs taller lines.
const SIZE_CLASSES = {
    normal: 'text-lg leading-8',
    large: 'text-xl leading-9',
    xlarge: 'text-2xl leading-10',
}


// ---------------------------------------------------------------
// One line of text with **bold**, *italic* and __underline__ drawn.
// parseInline() (utils/storyFormat.js) splits it into pieces, and
// each piece becomes the right tag.
// ---------------------------------------------------------------
function InlineText({ text }) {
    return parseInline(text).map((piece, index) => {
        if (piece.style === 'bold') return <strong key={index} className='font-bold text-white'>{piece.text}</strong>
        if (piece.style === 'italic') return <em key={index}>{piece.text}</em>
        if (piece.style === 'underline') return <u key={index}>{piece.text}</u>
        return <span key={index}>{piece.text}</span>
    })
}


// ---------------------------------------------------------------
// The story text itself. Used on the story page, in Focus mode, and
// as the Preview on the Write a Story page - so the logic lives in
// one place.
//
// Usage:
//   <StoryBody body={story.body} size='large' />
//   <StoryBody body={story.body} showScares />   -> jump-scare warnings on
//   <StoryBody body={story.body} easyRead />     -> dyslexia-friendly text (index.css, .easy-read)
//
// showScares: the reader asked to be warned before jump scares
// (StoryPage), or it's the writer's own Preview. Otherwise the
// !!scare marks are simply not drawn.
// ---------------------------------------------------------------
function StoryText({ body, size = 'normal', showScares = false, easyRead = false }) {
    // Text -> blocks (paragraphs, headings, lists...). See
    // utils/storyFormat.js for the rules.
    const blocks = parseStory(body)

    return (
        // The text goes in as plain text, NEVER as HTML
        // (dangerouslySetInnerHTML). Anyone can write a story, and HTML
        // would let them sneak a <script> in. As plain text, React
        // shows "<script>" as harmless letters.
        <div className={`space-y-6 text-gray-200 ${SIZE_CLASSES[size] || SIZE_CLASSES.normal} ${easyRead ? 'easy-read' : ''}`}>
            {/* key={index} is OK here - the blocks never get reordered
                and don't have ids. One if per block type. */}
            {blocks.map((block, index) => {
                if (block.type === 'h2') {
                    return <h2 key={index} className='pt-2 text-2xl font-bold text-white'><InlineText text={block.text} /></h2>
                }

                if (block.type === 'h3') {
                    return <h3 key={index} className='text-xl font-bold text-white'><InlineText text={block.text} /></h3>
                }

                if (block.type === 'scare') {
                    // data-scare-mark: Ambient mode (AmbientMode.jsx) looks for
                    // these to make the text flicker when one scrolls into view.
                    // Warnings off -> an invisible, zero-height marker (m-0! so
                    // it doesn't add an extra gap between paragraphs).
                    if (!showScares) return <span key={index} data-scare-mark aria-hidden='true' className='m-0! block h-0' />
                    return (
                        <p key={index} role='note' data-scare-mark className='flex items-center gap-2 text-sm font-semibold text-amber-300'>
                            <TriangleAlert className='h-4 w-4' />
                            Jump scare ahead
                        </p>
                    )
                }

                if (block.type === 'hr') {
                    return <hr key={index} className='border-gray-700' />
                }

                if (block.type === 'quote') {
                    // whitespace-pre-line keeps the line breaks inside the quote.
                    return (
                        <blockquote key={index} className='whitespace-pre-line border-l-4 border-red-600 pl-4 italic text-gray-300'>
                            <InlineText text={block.text} />
                        </blockquote>
                    )
                }

                if (block.type === 'list') {
                    // Same list, two possible tags: <ol> numbers it, <ul> uses dots.
                    const ListTag = block.ordered ? 'ol' : 'ul'
                    return (
                        <ListTag key={index} className={`space-y-1 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex}><InlineText text={item} /></li>
                            ))}
                        </ListTag>
                    )
                }

                // Normal paragraph. whitespace-pre-line keeps single line
                // breaks inside a paragraph (poems, dialogue).
                return (
                    <p key={index} className='whitespace-pre-line'>
                        <InlineText text={block.text} />
                    </p>
                )
            })}
        </div>
    )
}


// ---------------------------------------------------------------
// The one everybody uses. A normal story -> StoryText (above).
// A choose-your-path story ([[section: ...]] marks, utils/storyPaths.js)
// -> InteractiveStory, which shows one section at a time and uses
// StoryText to draw each section's text.
// showProblems: the Write page's Preview lists choices that go nowhere.
// ---------------------------------------------------------------
function StoryBody({ showProblems = false, ...props }) {
    if (isInteractive(props.body)) {
        return (
            <InteractiveStory
                body={props.body}
                showProblems={showProblems}
                renderText={text => <StoryText {...props} body={text} />}
            />
        )
    }
    return <StoryText {...props} />
}

export default StoryBody
