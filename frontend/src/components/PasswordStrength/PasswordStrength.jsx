// ---------------------------------------------------------------
// The 4 levels: the label, and the Tailwind colour for the bars and
// the text. Written out in full so Tailwind can see the class names
// (see styles/accents.js for why `bg-${color}-500` doesn't work).
// ---------------------------------------------------------------
const LEVELS = [
    { label: 'Too weak', bar: 'bg-red-600', text: 'text-red-400' },
    { label: 'Okay', bar: 'bg-orange-500', text: 'text-orange-400' },
    { label: 'Good', bar: 'bg-yellow-400', text: 'text-yellow-300' },
    { label: 'Strong', bar: 'bg-green-500', text: 'text-green-400' },
]


// ---------------------------------------------------------------
// Gives a password 0-4 points. One point for each thing it has:
//   - 8 or more characters
//   - 12 or more characters
//   - small AND capital letters
//   - a number AND a symbol
//
// /[a-z]/.test(password) = "is there at least one small letter?"
// /[^A-Za-z0-9]/ = anything that's NOT a letter or number = a symbol.
//
// This is only a HINT for the user. The real rules are Django's
// password validators (validate_password in accounts/serializers.py)
// - those can still say no, e.g. to "Password123!" for being common.
// ---------------------------------------------------------------
function getScore(password) {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
    return score
}


// ---------------------------------------------------------------
// FOUR BARS UNDER A PASSWORD BOX that fill up as it gets stronger:
//
//     ███ ███ ░░░ ░░░   Okay
//
// Usage (right under a <PasswordInput>):
//   <PasswordStrength password={form.password} />
//
// Shows nothing while the box is empty.
// ---------------------------------------------------------------
function PasswordStrength({ password }) {
    if (password === '') return null

    const score = getScore(password)

    // Score 0 and 1 both count as "Too weak" - so the lowest level
    // is LEVELS[0]. Math.max(0, score - 1) turns 0,1,2,3,4 into
    // 0,0,1,2,3.
    const level = LEVELS[Math.max(0, score - 1)]

    return (
        <div className='mt-2 flex items-center gap-3'>
            <div className='flex flex-1 gap-1.5'>
                {/* Always 4 bars. [0, 1, 2, 3].map gives us the position
                    of each one: bar 0 lights up at score 1 or more,
                    bar 1 at 2 or more, and so on. */}
                {[0, 1, 2, 3].map(index => (
                    <span
                        key={index}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                            index < Math.max(1, score) ? level.bar : 'bg-slate-700'
                        }`}
                    />
                ))}
            </div>

            {/* aria-live='polite': a screen reader reads the new label
                out loud when it changes, after the user stops typing. */}
            <span aria-live='polite' className={`w-16 text-right text-xs font-semibold ${level.text}`}>
                {level.label}
            </span>
        </div>
    )
}

export default PasswordStrength
