import { onBeforeUnmount } from 'vue'

export function useGameAudio() {
  let audio: AudioContext | undefined
  function unlock() {
    try {
      if (!audio && typeof AudioContext !== 'undefined') audio = new AudioContext()
      if (audio?.state === 'suspended') void audio.resume().catch(() => {})
    } catch { audio = undefined }
  }
  function tone(frequency: number, duration = .12, type: OscillatorType = 'sine') {
    if (!audio || audio.state !== 'running') return
    const time = audio.currentTime
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, time)
    gain.gain.setValueAtTime(.0001, time)
    gain.gain.exponentialRampToValueAtTime(.07, time + .012)
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    oscillator.start(time)
    oscillator.stop(time + duration)
  }
  onBeforeUnmount(() => { if (audio) void audio.close().catch(() => {}) })
  return { unlock, tone }
}
