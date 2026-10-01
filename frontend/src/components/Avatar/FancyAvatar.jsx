import { THEMES } from '../SettingsPage/settingsOptions'
import styles from './FancyAvatar.module.css'


// ---------------------------------------------------------------
// An avatar WITH the border someone picked in Settings -> Appearance:
// a glow / orbit ring / flicker in their theme colour, or the Pro
// Gold Crown.
//
// It wraps any avatar you give it (children), so the picture itself
// stays whatever it was:
//
//   <FancyAvatar theme='toxic' border='pulse'>
//       <Avatar username='raven' image={avatar} size='lg' />
//   </FancyAvatar>
//
// theme  = Profile.profile_theme ('blood-red', 'toxic'...)
// border = Profile.avatar_border ('none', 'pulse', 'orbit', 'flicker', 'gold')
// Django already sends 'none' instead of 'gold' for someone who's no
// longer Pro (shown_border in accounts/premium.py).
// ---------------------------------------------------------------
function FancyAvatar({ theme = 'blood-red', border = 'none', children }) {
    // The theme's real colour. ?. and ?? = fall back to red for an
    // unknown theme name, instead of crashing.
    const color = THEMES.find(item => item.value === theme)?.color ?? '#dc2626'

    // Which CSS Module class for which border. (Orbit is a separate
    // ring element - see below - so it has no class here.)
    const BORDER_CLASSES = {
        pulse: styles.pulse,
        flicker: styles.flicker,
        gold: styles.gold,
    }
    const borderClass = BORDER_CLASSES[border] ?? ''

    return (
        // '--theme-color' is a CSS variable the animations read.
        // relative = the anchor for the orbit ring (absolute, on top).
        <div className={`relative inline-block shrink-0 rounded-full ${borderClass}`} style={{ '--theme-color': color }}>
            {children}
            {border === 'orbit' && <span className={styles.orbit} aria-hidden='true' />}
        </div>
    )
}

export default FancyAvatar
