// ---------------------------------------------------------------
// THE NAME COLOURS Pro members can pick (Settings -> Appearance).
//
// `value` is what Django stores (Profile.NAME_COLORS - keep the two
// lists the same). `className` is the Tailwind colour - all light
// shades, so they're easy to read on the dark background.
// ---------------------------------------------------------------
export const NAME_COLORS = [
    { value: '', label: 'Normal', className: 'text-white' },
    { value: 'blood', label: 'Blood red', className: 'text-red-400' },
    { value: 'ember', label: 'Ember', className: 'text-amber-300' },
    { value: 'toxic', label: 'Toxic green', className: 'text-lime-400' },
    { value: 'void', label: 'Void purple', className: 'text-purple-300' },
    { value: 'ghost', label: 'Ghost blue', className: 'text-sky-300' },
]

// 'ember' -> 'text-amber-300'. Unknown or '' -> null (= keep the
// colour the page already uses).
export function nameColorClass(value) {
    if (!value) return null
    return NAME_COLORS.find(color => color.value === value)?.className ?? null
}
