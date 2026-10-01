// ---------------------------------------------------------------
// ACCENT COLOURS for the homepage sections.
//
// Story of the Day is yellow, Story of the Week is red - same
// components, different colour. So components take an `accent`
// prop ('yellow' or 'red') and look up their classes here:
//
//     const colors = ACCENTS[accent]
//     <span className={colors.text}>...</span>
//
// WHY NOT JUST `text-${accent}-400`?
// Tailwind reads your code BEFORE the app runs and only creates
// classes it can see written out in full. `text-${accent}-400` is
// built while the app runs, so Tailwind never sees "text-yellow-400"
// and that class simply doesn't exist. Writing every class out in
// full here is the standard fix.
//
// New colour? Copy a block, rename it, change the colour words.
// ---------------------------------------------------------------
export const ACCENTS = {
    yellow: {
        bar: 'bg-yellow-400',
        text: 'text-yellow-400',
        hoverText: 'hover:text-yellow-300',
        badge: 'border-yellow-600/50 bg-yellow-950/40 text-yellow-400',
        glow: 'shadow-yellow-900/20',
    },
    red: {
        bar: 'bg-red-600',
        // red-400, not 500: small red text on the dark cards needs the
        // lighter shade to be easy to read (4.5 : 1 contrast).
        text: 'text-red-400',
        hoverText: 'hover:text-red-300',
        badge: 'border-red-800/60 bg-red-950/40 text-red-400',
        glow: 'shadow-red-900/30',
    },
}
