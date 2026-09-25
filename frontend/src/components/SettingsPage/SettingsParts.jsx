// ---------------------------------------------------------------
// Small building blocks that EVERY settings section uses.
// Written once here, so all sections look the same - and to change
// the look of every card, you change it in one place.
//
//   <SettingsSection>  a title, a grey line under it, and a big card
//   <SettingRow>       one row: text on the left, a control on the right
//   <Toggle>           the round on/off switch
//   <ComingSoon>       the little yellow "Coming soon" badge
// ---------------------------------------------------------------


// ---------------------------------------------------------------
// One whole section of the page.
//
// Usage:
//   <SettingsSection id='profile' title='Profile' description='Update your...'>
//       ...anything...
//   </SettingsSection>
//
// `id` is what the sidebar links scroll to.
// scroll-mt-6 = when we scroll to it, stop 1.5rem ABOVE it, so the
// title isn't glued to the top edge of the window.
// ---------------------------------------------------------------
export function SettingsSection({ id, title, description, children }) {
    return (
        <section id={id} className='scroll-mt-6'>
            <h2 className='text-lg font-bold text-white'>{title}</h2>
            <p className='mt-1 text-sm text-gray-400'>{description}</p>

            {/* The big card. {children} = whatever you put between
                <SettingsSection> and </SettingsSection>. */}
            <div className='mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                {children}
            </div>
        </section>
    )
}


// ---------------------------------------------------------------
// One row inside a card: title + small text on the left, and
// something on the right (a Toggle, a button...).
//
// Usage:
//   <SettingRow title='Private Profile' text='When on, ...'>
//       <Toggle on={isPrivate} onChange={...} />
//   </SettingRow>
//
// `danger` makes the row red (for Delete Account).
// ---------------------------------------------------------------
export function SettingRow({ title, text, badge, danger = false, children }) {
    // Two complete class lists instead of adding a red class on top
    // of a grey one (see the ITEM_STYLE comment in UserMenu.jsx).
    const boxStyle = danger
        ? 'border-red-900/70 bg-red-950/20'
        : 'border-slate-800 bg-slate-900'

    return (
        // flex-col on phones (control goes UNDER the text),
        // flex-row from the "sm" size up (control on the right).
        <div className={`flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between ${boxStyle}`}>
            <div>
                <p className={`flex items-center gap-2 font-semibold ${danger ? 'text-red-400' : 'text-white'}`}>
                    {title}
                    {/* e.g. <ComingSoon />. If no badge was given it's
                        undefined, and React draws nothing. */}
                    {badge}
                </p>
                <p className='mt-1 text-xs text-gray-400'>{text}</p>
            </div>

            {/* shrink-0 = the button never gets squashed by long text. */}
            <div className='shrink-0'>{children}</div>
        </div>
    )
}


// ---------------------------------------------------------------
// The on/off switch.
//
// Usage:
//   <Toggle on={weeklyDigest} onChange={newValue => ...} label='Weekly digest' />
//
// Controlled, like SegmentedControl: the PARENT keeps the true/false
// and passes it in. Clicking only calls onChange(!on) - "please
// flip it" - and the parent decides what happens.
//
// role='switch' + aria-checked tell screen readers it's a switch and
// whether it's on. `label` is read out, because there's no text inside.
// ---------------------------------------------------------------
export function Toggle({ on, onChange, label, disabled = false }) {
    return (
        <button
            type='button'
            role='switch'
            aria-checked={on}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!on)}
            className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                on ? 'bg-red-600' : 'bg-slate-700'
            }`}
        >
            {/* The white knob. translate-x-5 slides it to the right
                when on; transition-transform animates the slide. */}
            <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    )
}


// The little badge for features we show but haven't built yet.
export function ComingSoon() {
    return (
        <span className='rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-300'>
            Coming soon
        </span>
    )
}
