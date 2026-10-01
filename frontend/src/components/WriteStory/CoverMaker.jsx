import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, Wand2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import SegmentedControl from '../SegmentedControl/SegmentedControl'


// ---------------------------------------------------------------
// THE COVER MAKER (Pro) on the Write page.
//
//   <CoverMaker title={form.title} onMake={file => useThisCover(file)} />
//
// It DRAWS a cover in the browser with a <canvas> - your title, your
// name and a spooky background - then turns the drawing into an image
// file, exactly like one you picked from your computer. No AI and no
// image service, so it's free to run and works offline.
//
// A <canvas> is a blank picture you draw on with JavaScript:
//   ctx.fillStyle = 'red'; ctx.fillRect(x, y, width, height)
// (0, 0) is the TOP-LEFT corner; y goes DOWN.
// ---------------------------------------------------------------

// The cover size: the same shape as the covers on story cards.
const WIDTH = 1200
const HEIGHT = 630

// Pages CROP covers differently (the story page is wide on a laptop,
// narrower on a phone). So the text stays in the middle area that
// survives every crop: centred, and not too near the top or bottom.
const CENTER_X = WIDTH / 2
const TEXT_WIDTH = 860

const STYLES = [
    { value: 'blood', label: 'Blood moon' },
    { value: 'fog', label: 'Fog' },
    { value: 'static', label: 'VHS static' },
]


function CoverMaker({ title, onMake }) {
    const { user } = useAuth()
    const [style, setStyle] = useState('blood')
    const [making, setMaking] = useState(false)

    // Not Pro: a small note instead of the tool.
    if (!user?.is_premium) {
        return (
            <p className='mt-3 flex items-center gap-2 text-xs text-gray-500'>
                <Crown className='h-3.5 w-3.5 text-yellow-400' aria-hidden='true' />
                No picture? <Link to='/premium' className='text-yellow-400 underline'>Pro</Link> writers can make a cover in one click.
            </p>
        )
    }

    function handleMake() {
        setMaking(true)
        const canvas = drawCover(style, title.trim() || 'Untitled', user.username)
        // toBlob = "turn the drawing into image data". It's not instant,
        // so it calls us back when it's done. 0.9 = JPEG quality (90%).
        canvas.toBlob(blob => {
            setMaking(false)
            if (!blob) return
            // A File is a Blob with a name - the same thing an
            // <input type='file'> gives you.
            onMake(new File([blob], 'cover.jpg', { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.9)
    }

    return (
        <div className='mt-3 rounded-lg border border-yellow-800/50 bg-yellow-950/20 p-4'>
            <p className='flex items-center gap-2 text-sm font-semibold text-yellow-100'>
                <Wand2 className='h-4 w-4 text-yellow-400' aria-hidden='true' />
                Cover maker <span className='rounded bg-yellow-400 px-1 text-[9px] font-extrabold text-black'>PRO</span>
            </p>
            <p className='mt-1 text-xs text-gray-400'>Uses your title and name. Make it again after changing the title.</p>
            <div className='mt-3 flex flex-wrap items-center gap-3'>
                <SegmentedControl label='Cover style' value={style} onChange={setStyle} options={STYLES} />
                <button
                    type='button'
                    onClick={handleMake}
                    disabled={making}
                    className='rounded-full bg-yellow-500 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-400 disabled:opacity-50'
                >
                    {making ? 'Making...' : 'Make my cover'}
                </button>
            </div>
        </div>
    )
}


// ===============================================================
// THE DRAWING - plain functions, no React. Each returns nothing and
// just paints on `ctx` (the canvas's "pen").
// ===============================================================

function drawCover(style, title, author) {
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const ctx = canvas.getContext('2d')

    if (style === 'blood') drawBloodMoon(ctx)
    if (style === 'fog') drawFog(ctx)
    if (style === 'static') drawStatic(ctx)

    // A dark band at the bottom so the text is always readable.
    const shade = ctx.createLinearGradient(0, HEIGHT * 0.45, 0, HEIGHT)
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)')
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.85)')
    ctx.fillStyle = shade
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    drawTitle(ctx, title, style)

    ctx.textAlign = 'center'
    ctx.font = '600 30px Georgia, serif'
    ctx.fillStyle = '#d1d5db'
    ctx.fillText(`by ${author}`, CENTER_X, HEIGHT - 140)

    ctx.font = '700 18px Arial, sans-serif'
    ctx.fillStyle = 'rgba(248, 113, 113, 0.9)'
    ctx.fillText('S I L E N T   E V I D E N C E', CENTER_X, HEIGHT - 100)
    return canvas
}


// A dark red sky with a big moon.
function drawBloodMoon(ctx) {
    // createRadialGradient(x1, y1, r1, x2, y2, r2): from the moon outwards.
    const sky = ctx.createRadialGradient(900, 170, 40, 900, 170, 900)
    sky.addColorStop(0, '#7f1d1d')
    sky.addColorStop(0.5, '#2a0707')
    sky.addColorStop(1, '#050505')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // The moon: a circle = an arc all the way round (0 to 2 x PI).
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 80
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.arc(900, 170, 110, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Bare trees along the bottom: thin black lines.
    ctx.strokeStyle = '#000'
    for (let x = 30; x < WIDTH; x += 140) {
        const top = 300 + ((x * 7) % 120)   // different heights, but the same every time
        ctx.lineWidth = 10
        ctx.beginPath()
        ctx.moveTo(x, HEIGHT)
        ctx.lineTo(x + 8, top)
        ctx.stroke()
        // two branches
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(x + 6, top + 60)
        ctx.lineTo(x + 50, top + 20)
        ctx.moveTo(x + 4, top + 110)
        ctx.lineTo(x - 40, top + 70)
        ctx.stroke()
    }
}


// Grey-blue darkness with soft fog patches.
function drawFog(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT)
    sky.addColorStop(0, '#1e293b')
    sky.addColorStop(1, '#020617')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // Blurred white ellipses = fog. (Browsers without ctx.filter just
    // draw them sharp - still fine.)
    ctx.filter = 'blur(40px)'
    ctx.fillStyle = 'rgba(203, 213, 225, 0.18)'
    for (let i = 0; i < 7; i++) {
        ctx.beginPath()
        ctx.ellipse(120 + i * 170, 230 + (i % 3) * 90, 260, 70, 0, 0, Math.PI * 2)
        ctx.fill()
    }
    ctx.filter = 'none'

    // A lone figure in the fog.
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)'
    ctx.beginPath()
    ctx.arc(860, 250, 22, 0, Math.PI * 2)          // head
    ctx.fill()
    ctx.fillRect(840, 270, 40, 120)                // body
}


// Old-tape look: dark green, scan lines and random noise.
function drawStatic(ctx) {
    ctx.fillStyle = '#04120a'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // Noise: lots of tiny grey squares in random places.
    for (let i = 0; i < 6000; i++) {
        const shade = Math.floor(Math.random() * 120)
        ctx.fillStyle = `rgba(${shade}, ${shade + 40}, ${shade}, 0.35)`
        ctx.fillRect(Math.random() * WIDTH, Math.random() * HEIGHT, 3, 3)
    }

    // Scan lines: a thin dark line every 4 pixels.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    for (let y = 0; y < HEIGHT; y += 4) {
        ctx.fillRect(0, y, WIDTH, 1)
    }

    // The "PLAY >" a VCR shows in the corner.
    ctx.font = '700 34px "Courier New", monospace'
    ctx.fillStyle = '#86efac'
    ctx.textAlign = 'left'
    ctx.fillText('PLAY ▶', 60, 80)
}


// The title: big, wrapped over up to 3 lines, and smaller if it's long.
function drawTitle(ctx, title, style) {
    const maxWidth = TEXT_WIDTH
    let size = 76
    let lines = wrapText(ctx, title, size, maxWidth)
    // Too many lines? Try smaller letters until it fits (or 44px).
    while (lines.length > 3 && size > 44) {
        size -= 8
        lines = wrapText(ctx, title, size, maxWidth)
    }
    lines = lines.slice(0, 3)

    ctx.font = `700 ${size}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = style === 'static' ? '#bbf7d0' : '#ffffff'
    ctx.shadowColor = style === 'static' ? '#22c55e' : '#000000'
    ctx.shadowBlur = 18

    // Stack the lines upwards from just above the author's name.
    const lineHeight = size * 1.15
    const bottom = HEIGHT - 195
    lines.forEach((line, index) => {
        const y = bottom - (lines.length - 1 - index) * lineHeight
        ctx.fillText(line, CENTER_X, y)
    })
    ctx.shadowBlur = 0
}


// "The House on Wren Street" -> ['The House on', 'Wren Street']
// Adds words to a line until the next one wouldn't fit.
function wrapText(ctx, text, size, maxWidth) {
    ctx.font = `700 ${size}px Georgia, serif`
    const lines = []
    let line = ''
    for (const word of text.split(/\s+/)) {
        const tryLine = line ? `${line} ${word}` : word
        if (ctx.measureText(tryLine).width > maxWidth && line) {
            lines.push(line)
            line = word
        } else {
            line = tryLine
        }
    }
    if (line) lines.push(line)
    return lines
}

export default CoverMaker
