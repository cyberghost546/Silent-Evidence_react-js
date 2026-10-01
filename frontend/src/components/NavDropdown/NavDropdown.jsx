import { useDropdown } from '../../hooks/useDropdown'
import './NavDropdown.css'


// ===============================================================
// A REUSABLE DROPDOWN MENU
//
// HOW TO USE IT ON ANY PAGE:
//
//   import NavDropdown from '../NavDropdown/NavDropdown'
//
//   const items = [
//       { label: 'Paranormal', href: '/category/paranormal' },
//       { label: 'True Crime', href: '/category/true-crime' },
//   ]
//
//   <NavDropdown label='Categories' items={items} />
//
// PROPS (the values the parent passes in):
//   label - the text on the button, e.g. "Categories"
//   items - an array of { label, href } objects for the menu rows
//
// This component knows NOTHING about categories, forums, or where
// the data came from. It just draws a button and a list. That is
// what makes it reusable - the parent decides what goes in it.
// ===============================================================

function NavDropdown({ label, items }) {
    // All the open/close behaviour lives in our custom hook:
    //   open   - true or false, is the menu showing
    //   toggle - flip it (for the button)
    //   close  - force it shut (after clicking a link)
    //   ref    - attach to the wrapper so the hook can detect
    //            clicks that land outside the menu
    const { open, toggle, close, ref } = useDropdown()

    return (
        // "relative" here is important. The panel below uses
        // "absolute", which positions itself against the nearest
        // positioned parent. Remove this and the panel jumps to the
        // corner of the page.
        <div className='relative' ref={ref}>

            {/* ---------- THE BUTTON ---------- */}
            <button
                type='button'
                onClick={toggle}
                aria-haspopup='menu'
                aria-expanded={open}
                className='flex items-center gap-1 text-gray-200 hover:text-white transition-colors'
            >
                {label}

                {/* The little arrow. It spins around when the menu
                    opens, which makes the button feel responsive. */}
                <svg
                    className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    viewBox='0 0 24 24'
                    aria-hidden='true'
                >
                    <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
                </svg>
            </button>

            {/* ---------- THE PANEL ---------- */}
            {/* "open && (...)" means: only draw this when open is true.
                When open is false React renders nothing at all. */}
            {open && (
                <div
                    role='menu'
                    className='dropdown-scroll absolute left-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-lg bg-slate-900 shadow-xl ring-1 ring-black/40 z-50'
                >
                    {/* The classes doing the work here:
                        max-h-80        - stop growing at 20rem (320px)
                        overflow-y-auto - add a scrollbar IF it overflows
                        dropdown-scroll - our red scrollbar (NavDropdown.css)
                        z-50            - sit above the page content below

                        max-h + overflow-y-auto is the whole trick for a
                        scrolling menu. With 52 categories it scrolls;
                        with 3 forum links it just sizes to fit. */}

                    {items.length === 0 ? (
                        // Always handle the empty case. Without this the
                        // menu opens as an invisible sliver and looks broken.
                        <p className='px-4 py-3 text-sm text-gray-400'>
                            Nothing here yet
                        </p>
                    ) : (
                        // .map() turns each item in the array into a link.
                        items.map(item => (
                            <a
                                // "key" is required by React for any list.
                                // It uses it to tell the rows apart between
                                // renders. href is unique here, so it works.
                                key={item.href}
                                href={item.href}
                                role='menuitem'

                                // Close the menu after a click, so it isn't
                                // still hanging open on the next page.
                                onClick={close}

                                // No divider lines between rows - the hover
                                // background already shows which row you're on.
                                // (To bring them back: add
                                // border-b border-slate-700 last:border-b-0)
                                className='block px-4 py-3 text-sm text-gray-200 hover:bg-slate-700 hover:text-white transition-colors'
                            >
                                {item.label}
                            </a>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

export default NavDropdown
