import { useEffect } from 'react'


// ---------------------------------------------------------------
// LINE FOCUS for "Easy read": the paragraph in the middle of the
// screen stays bright, the others fade a little (index.css,
// .easy-read). It helps readers who lose their place - common with
// dyslexia.
//
//   useLineFocus(bodyRef, easyRead)
//
// bodyRef = the box around StoryBody. We mark the block nearest the
// middle of the screen with the class "is-focus".
// ---------------------------------------------------------------
export function useLineFocus(bodyRef, on) {
    useEffect(() => {
        const box = bodyRef.current
        if (!on || !box) return

        function update() {
            // The story's blocks (paragraphs, headings...) are the
            // children of StoryBody's own <div>.
            const blocks = box.firstElementChild ? [...box.firstElementChild.children] : []
            const middle = window.innerHeight / 2
            let closest = null
            let closestDistance = Infinity
            for (const block of blocks) {
                const rect = block.getBoundingClientRect()
                const distance = Math.abs(rect.top + rect.height / 2 - middle)
                if (distance < closestDistance) {
                    closest = block
                    closestDistance = distance
                }
            }
            blocks.forEach(block => block.classList.toggle('is-focus', block === closest))
        }

        update()
        window.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
            // Switched off: no paragraph stays marked (all bright again).
            box.querySelectorAll('.is-focus').forEach(block => block.classList.remove('is-focus'))
        }
    }, [bodyRef, on])
}
