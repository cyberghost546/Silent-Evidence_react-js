import { useRef, useState } from 'react'
import { Undo2, Redo2 } from 'lucide-react'
import StoryBody from '../StoryPage/StoryBody'
import { countWords } from '../../utils/storyFormat'


// ---------------------------------------------------------------
// THE STORY BOX: a toolbar on top of a big <textarea>.
//
// Usage (a "controlled component", like SegmentedControl):
//   const [body, setBody] = useState('')
//   <StoryEditor value={body} onChange={setBody} />
//
// The buttons don't make real bold text - they type the same marks
// Markdown uses (**bold**, ## Heading...). StoryBody turns those
// into real bold text / headings on the story page. The rules are
// in utils/storyFormat.js.
// ---------------------------------------------------------------


// One small toolbar button, so the classes are written once.
//
// onMouseDown + preventDefault: normally pressing a button takes the
// focus away from the textarea, and the text you selected is lost.
// This stops that, so "select a word -> click B" works.
function ToolbarButton({ label, title, onClick, disabled }) {
    return (
        <button
            type='button'
            title={title}
            aria-label={title}
            onMouseDown={e => e.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            className='rounded px-2 py-1 text-sm text-gray-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent'
        >
            {label}
        </button>
    )
}

// The thin grey line between groups of buttons.
function Divider() {
    return <span className='mx-1 h-5 w-px bg-slate-600' />
}


function StoryEditor({ value, onChange, id }) {
    // A handle on the real <textarea>, so we can ask it where the
    // cursor is (selectionStart / selectionEnd).
    const textareaRef = useRef(null)

    // false = writing, true = showing what readers will see.
    const [preview, setPreview] = useState(false)

    // -----------------------------------------------------------
    // Puts `text` where the cursor is (replacing any selected text).
    //
    // document.execCommand('insertText') is an OLD browser function,
    // but it's still the only way to change a textarea that keeps
    // Ctrl+Z / the undo button working. It also fires the textarea's
    // normal onChange, so React's state updates by itself.
    //
    // If a browser ever refuses (returns false), we fall back to
    // building the new text ourselves.
    // -----------------------------------------------------------
    function insertText(text) {
        const box = textareaRef.current
        box.focus()

        const worked = document.execCommand('insertText', false, text)

        if (!worked) {
            const start = box.selectionStart
            const end = box.selectionEnd
            onChange(value.slice(0, start) + text + value.slice(end))
        }
    }

    // Bold / italic / underline: put the mark on BOTH sides of the
    // selected text. Nothing selected? Put in a word to type over.
    function wrapSelection(mark) {
        const box = textareaRef.current
        const selected = value.slice(box.selectionStart, box.selectionEnd) || 'text'
        insertText(mark + selected + mark)
    }

    // Headings, lists, quotes: the mark goes at the START of the
    // line the cursor is on.
    // lastIndexOf('\n', ...) finds the line break before the cursor;
    // +1 = the first character after it. (No line break found = -1,
    // and -1 + 1 = 0 = the very start of the text. Handy!)
    function addToLineStart(prefix) {
        const box = textareaRef.current
        const lineStart = value.lastIndexOf('\n', box.selectionStart - 1) + 1

        box.focus()
        box.setSelectionRange(lineStart, lineStart)
        insertText(prefix)
    }

    function undo() {
        textareaRef.current.focus()
        document.execCommand('undo')
    }

    function redo() {
        textareaRef.current.focus()
        document.execCommand('redo')
    }

    const words = countWords(value)

    return (
        // focus-within: = "when anything inside has focus". The whole
        // box gets the red border, not just the textarea.
        <div className='overflow-hidden rounded-xl border border-slate-700 bg-slate-800 focus-within:border-red-600'>

            {/* ---------- TOOLBAR ---------- */}
            {/* flex-wrap: on a phone the buttons go onto a second row
                instead of sticking out of the box. */}
            <div className='flex flex-wrap items-center gap-0.5 border-b border-slate-700 px-3 py-2'>
                <ToolbarButton label={<b>B</b>} title='Bold' onClick={() => wrapSelection('**')} disabled={preview} />
                <ToolbarButton label={<i>I</i>} title='Italic' onClick={() => wrapSelection('*')} disabled={preview} />
                <ToolbarButton label={<u>U</u>} title='Underline' onClick={() => wrapSelection('__')} disabled={preview} />

                <Divider />
                <ToolbarButton label='H2' title='Heading' onClick={() => addToLineStart('## ')} disabled={preview} />
                <ToolbarButton label='H3' title='Small heading' onClick={() => addToLineStart('### ')} disabled={preview} />

                <Divider />
                <ToolbarButton label='• List' title='Bullet list' onClick={() => addToLineStart('- ')} disabled={preview} />
                <ToolbarButton label='1. List' title='Numbered list' onClick={() => addToLineStart('1. ')} disabled={preview} />

                <Divider />
                <ToolbarButton label='“ Quote' title='Quote' onClick={() => addToLineStart('> ')} disabled={preview} />
                <ToolbarButton label='— HR' title='Divider line' onClick={() => insertText('\n\n---\n\n')} disabled={preview} />
                {/* Marks where a jump scare happens - readers can ask to
                    be warned (utils/storyFormat.js, JUMP_SCARE_MARK). */}
                <ToolbarButton label='⚠ Scare' title='Jump scare' onClick={() => insertText('\n\n!!scare\n\n')} disabled={preview} />

                <Divider />
                {/* Choose-your-path stories (utils/storyPaths.js): a new
                    section, and a choice that jumps to one. Type over
                    "name" / "What they do" - the Preview shows mistakes. */}
                <ToolbarButton label='§ Section' title='New section (choose-your-path)' onClick={() => insertText('\n\n[[section: name]]\n')} disabled={preview} />
                <ToolbarButton label='↳ Choice' title='Choice (choose-your-path)' onClick={() => insertText('\n[[choice: What they do -> name]]\n')} disabled={preview} />

                <Divider />
                <ToolbarButton label={<Undo2 className='h-4 w-4' />} title='Undo' onClick={undo} disabled={preview} />
                <ToolbarButton label={<Redo2 className='h-4 w-4' />} title='Redo' onClick={redo} disabled={preview} />

                {/* ml-auto pushes these two to the far right. */}
                <div className='ml-auto flex items-center gap-3'>
                    <button
                        type='button'
                        onClick={() => setPreview(p => !p)}
                        className='text-xs font-medium text-red-400 hover:text-red-300'
                    >
                        {preview ? 'Edit' : 'Preview'}
                    </button>
                    <span className='text-xs text-gray-500'>{words} words</span>
                </div>
            </div>

            {/* ---------- WRITE or PREVIEW ---------- */}
            {preview ? (
                // The SAME component the story page uses, so the preview
                // is exactly what readers will see.
                <div className='min-h-80 px-5 py-4'>
                    {value.trim() === '' ? (
                        <p className='text-gray-500'>Nothing to preview yet.</p>
                    ) : (
                        <StoryBody body={value} size='normal' showScares showProblems />
                    )}
                </div>
            ) : (
                <textarea
                    id={id}
                    ref={textareaRef}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder='Tell your story...'
                    // resize-y = the user can drag it taller, not wider.
                    className='block min-h-80 w-full resize-y bg-transparent px-5 py-4 leading-7 text-white placeholder:text-slate-500 focus:outline-none'
                />
            )}
        </div>
    )
}

export default StoryEditor
