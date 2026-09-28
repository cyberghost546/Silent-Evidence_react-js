import { useState } from 'react'
import { Signpost, Undo2, RotateCcw, TriangleAlert } from 'lucide-react'
import { parsePaths } from '../../utils/storyPaths'


// ---------------------------------------------------------------
// A CHOOSE-YOUR-PATH story: one section at a time, the choices as
// buttons, Back and Start over. (How writers mark sections and
// choices: utils/storyPaths.js.)
//
// Usage (StoryBody does this by itself for path stories):
//   <InteractiveStory body={story.body} renderText={text => <...the normal text.../>} showProblems />
//
// renderText draws a section's text the normal way (headings, bold,
// jump-scare marks...) - passed in, so this file doesn't need to know how.
// showProblems: the writer's Preview - lists choices that go nowhere.
// ---------------------------------------------------------------
function InteractiveStory({ body, renderText, showProblems = false }) {
    const { start, sections, problems } = parsePaths(body)
    // The path so far, e.g. ['start', 'cellar'] - the last one is where you are.
    const [path, setPath] = useState([start])
    const here = path[path.length - 1]
    const section = sections[here]

    function choose(to) {
        setPath([...path, to])
        // Back to the top of the new section, like turning a page.
        document.getElementById('story-path-top')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
    }

    return (
        <div>
            <p id='story-path-top' className='mb-6 flex scroll-mt-24 items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300'>
                <Signpost className='h-4 w-4' /> Choose your path · step {path.length}
            </p>

            {showProblems && problems.length > 0 && (
                <ul className='mb-6 space-y-1 rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-sm text-amber-200'>
                    {problems.map(problem => (
                        <li key={problem} className='flex gap-2'><TriangleAlert className='mt-0.5 h-4 w-4 shrink-0' /> {problem}</li>
                    ))}
                </ul>
            )}

            {section ? renderText(section.text) : <p className='text-gray-400'>This part of the story is missing.</p>}

            {/* ---------- THE CHOICES (or THE END) ---------- */}
            <div className='mt-10 border-t border-slate-800 pt-6'>
                {section?.choices.length > 0 ? (
                    <>
                        <p className='mb-3 text-sm font-semibold text-gray-300'>What do you do?</p>
                        <div className='flex flex-col gap-3'>
                            {section.choices.map(choice => (
                                <button
                                    key={choice.label + choice.to}
                                    type='button'
                                    onClick={() => choose(choice.to)}
                                    className='rounded-xl border border-red-800 bg-red-950/30 px-5 py-3 text-left font-semibold text-red-100 transition-colors hover:bg-red-900/40'
                                >
                                    {choice.label}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className='text-center font-serif text-2xl font-bold text-red-500'>~ The End ~</p>
                )}

                <div className='mt-6 flex justify-center gap-6 text-sm'>
                    {path.length > 1 && (
                        <button type='button' onClick={() => setPath(path.slice(0, -1))} className='flex items-center gap-1 text-gray-400 hover:text-white'>
                            <Undo2 className='h-4 w-4' /> Back
                        </button>
                    )}
                    {path.length > 1 && (
                        <button type='button' onClick={() => setPath([start])} className='flex items-center gap-1 text-gray-400 hover:text-white'>
                            <RotateCcw className='h-4 w-4' /> Start over
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default InteractiveStory
