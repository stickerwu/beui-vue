// Synthesized game feedback (gem chimes that climb with a streak, a mine's blast, a cash-out
// arpeggio) built from oscillators and noise at runtime, so there are no audio files to ship.
// Mirrors lib/game-sounds.ts.
import { getAudioContext, retainAudioContext } from '../core/audio-context'

const MASTER_GAIN = 0.12
// Pentatonic steps from G5, so any run of gems stays in key.
const BASE = 783.99
const SCALE = [0, 2, 4, 7, 9]

// The context is shared page-wide (core/audio-context.ts). The master gain belongs to it, so it is
// rebuilt if the context was closed and recreated.
let master: GainNode | null = null

function ensureContext() {
  const ctx = getAudioContext()
  if (ctx && master?.context !== ctx) {
    master = ctx.createGain()
    master.gain.value = MASTER_GAIN
    master.connect(ctx.destination)
  }
  return ctx
}

function tone(context: AudioContext, frequency: number, at: number, { duration = 0.18, type = 'sine', gain = 1 }: { duration?: number; type?: OscillatorType; gain?: number } = {}) {
  if (!master) return
  const osc = context.createOscillator()
  const env = context.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, at)
  env.gain.setValueAtTime(0.0001, at)
  env.gain.exponentialRampToValueAtTime(gain, at + 0.005)
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  osc.connect(env).connect(master)
  osc.start(at)
  osc.stop(at + duration + 0.02)
  osc.onended = () => env.disconnect()
}

function note(step: number) {
  const octave = Math.floor(step / SCALE.length)
  const semitones = SCALE[step % SCALE.length]! + octave * 12
  return BASE * 2 ** (semitones / 12)
}

export interface GameSounds {
  /** Unlock audio; call from a click or key handler. */
  prepare: () => void
  /** A gem; `streak` counts gems in a row, from 1. */
  gem: (streak: number) => void
  mine: () => void
  cashOut: () => void
  dispose: () => void
}

/** Lazily-initialized game sounds on the page's shared AudioContext. Every call is a silent no-op without Web Audio or during SSR. */
export function createGameSounds(): GameSounds {
  const release = retainAudioContext()
  let disposed = false
  const live = () => (disposed ? null : ensureContext())

  return {
    prepare() { live() },
    gem(streak) {
      const context = live()
      if (!context) return
      const now = context.currentTime
      const run = streak % 5 === 0
      const at = run ? now + 0.06 : now
      if (run) {
        for (const [index, offset] of [-2, -1].entries()) {
          tone(context, note(Math.max(0, streak - 1 + offset)), now + index * 0.03, { gain: 0.35, duration: 0.08 })
        }
      }
      const frequency = note(Math.min(streak - 1, SCALE.length * 2))
      tone(context, frequency, at, { gain: 0.9 })
      tone(context, frequency * 2, at, { type: 'triangle', gain: 0.15, duration: 0.12 })
      if (streak >= 3) tone(context, frequency * 1.5, at + 0.05, { gain: 0.25, duration: 0.1 })
    },
    mine() {
      const context = live()
      if (!context || !master) return
      const now = context.currentTime
      const length = Math.ceil(context.sampleRate * 0.45)
      const buffer = context.createBuffer(1, length, context.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
      const noise = context.createBufferSource()
      noise.buffer = buffer
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1600, now)
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.4)
      const env = context.createGain()
      env.gain.setValueAtTime(1.1, now)
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)
      noise.connect(filter).connect(env).connect(master)
      noise.start(now)
      noise.onended = () => env.disconnect()
      const thump = context.createOscillator()
      const thumpEnv = context.createGain()
      thump.type = 'sine'
      thump.frequency.setValueAtTime(110, now)
      thump.frequency.exponentialRampToValueAtTime(42, now + 0.3)
      thumpEnv.gain.setValueAtTime(1.4, now)
      thumpEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
      thump.connect(thumpEnv).connect(master)
      thump.start(now)
      thump.stop(now + 0.34)
      thump.onended = () => thumpEnv.disconnect()
    },
    cashOut() {
      const context = live()
      if (!context) return
      const now = context.currentTime
      for (const [index, frequency] of [523.25, 659.25, 783.99, 1046.5].entries()) {
        const last = index === 3
        tone(context, frequency, now + index * 0.06, { type: 'triangle', gain: 0.6, duration: last ? 0.45 : 0.14 })
        if (last) tone(context, frequency * 2, now + index * 0.06, { gain: 0.15, duration: 0.5 })
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      release()
    },
  }
}
