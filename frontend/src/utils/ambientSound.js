// ---------------------------------------------------------------
// CAMPFIRE MODE SOUNDS - made in the browser, no audio files.
//
// The Web Audio API works like a chain of boxes ("nodes"):
//
//     noise  ->  filter  ->  volume (gain)  ->  speakers
//
// Every sound here starts from NOISE (random numbers = a hiss) and
// shapes it with filters:
//   - rain: a soft, high hiss             (white noise, cut the lows)
//   - wind: a deep rumble that swells     (brown noise + a filter that
//                                          slowly moves up and down)
//   - fire: a low roar + random crackles  (brown noise + short clicks)
//
//   const sound = startAmbient(context, 'rain', volumeNode)
//   ...
//   sound.stop()
// ---------------------------------------------------------------

export const AMBIENT_SOUNDS = [
    { value: 'rain', label: 'Rain', emoji: '🌧️' },
    { value: 'wind', label: 'Wind', emoji: '🌬️' },
    { value: 'fire', label: 'Fire', emoji: '🔥' },
]


// Two seconds of noise, played in a loop.
//   white = every sample random        -> "shhh" (bright)
//   brown = each sample a small step   -> "rrrr" (deep, like wind)
//           from the one before
function makeNoise(context, kind) {
    const length = context.sampleRate * 2
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const samples = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1       // -1 ... 1
        if (kind === 'white') {
            samples[i] = white
        } else {
            last = (last + 0.02 * white) / 1.02
            samples[i] = last * 3.5                // make it loud enough again
        }
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    return source
}


export function startAmbient(context, kind, output) {
    const nodes = []            // everything we start, to stop it later
    const timers = []

    if (kind === 'rain') {
        const noise = makeNoise(context, 'white')
        // highpass = let only the HIGH sounds through (no rumble).
        const high = context.createBiquadFilter()
        high.type = 'highpass'
        high.frequency.value = 500
        // lowpass = cut the harshest hiss, so it sounds like rain on a roof.
        const low = context.createBiquadFilter()
        low.type = 'lowpass'
        low.frequency.value = 4000
        const quiet = context.createGain()
        quiet.gain.value = 0.35
        noise.connect(high).connect(low).connect(quiet).connect(output)
        noise.start()
        nodes.push(noise)
    }

    if (kind === 'wind') {
        const noise = makeNoise(context, 'brown')
        const band = context.createBiquadFilter()
        band.type = 'bandpass'
        band.frequency.value = 400
        band.Q.value = 0.8
        // An LFO ("low frequency oscillator") = a very slow wave, here
        // one swell every ~7 seconds, that moves the filter up and down.
        const lfo = context.createOscillator()
        lfo.frequency.value = 0.15
        const lfoAmount = context.createGain()
        lfoAmount.gain.value = 250       // the filter moves 150 <-> 650 Hz
        lfo.connect(lfoAmount).connect(band.frequency)
        noise.connect(band).connect(output)
        noise.start()
        lfo.start()
        nodes.push(noise, lfo)
    }

    if (kind === 'fire') {
        // The low roar.
        const noise = makeNoise(context, 'brown')
        const low = context.createBiquadFilter()
        low.type = 'lowpass'
        low.frequency.value = 600
        const roar = context.createGain()
        roar.gain.value = 0.6
        noise.connect(low).connect(roar).connect(output)
        noise.start()
        nodes.push(noise)

        // The crackles: every so often a tiny, sharp burst of noise.
        const crackleNoise = makeNoise(context, 'white')
        const sharp = context.createBiquadFilter()
        sharp.type = 'highpass'
        sharp.frequency.value = 2000
        const crackle = context.createGain()
        crackle.gain.value = 0            // silent between crackles
        crackleNoise.connect(sharp).connect(crackle).connect(output)
        crackleNoise.start()
        nodes.push(crackleNoise)

        function scheduleCrackle() {
            const now = context.currentTime
            // Up to full volume in 1 ms, back to silence in ~30 ms = "tk".
            crackle.gain.setValueAtTime(0.6 * Math.random() + 0.2, now)
            crackle.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
            // Next crackle in 0.05 - 0.6 seconds: irregular, like a real fire.
            timers.push(setTimeout(scheduleCrackle, 50 + Math.random() * 550))
        }
        scheduleCrackle()
    }

    return {
        stop() {
            timers.forEach(clearTimeout)
            nodes.forEach(node => {
                try {
                    node.stop()
                } catch {
                    // already stopped - fine
                }
            })
        },
    }
}
