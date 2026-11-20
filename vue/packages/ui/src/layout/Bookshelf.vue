<script setup lang="ts">
import { nextTick, onBeforeUnmount, useTemplateRef } from 'vue'

interface Book { id: string; title: string; author?: string; color: string; textColor?: string; coverImage?: string; thickness?: number }
const { books, height = 300, coverRatio = .68, gap = 3, openGap = 16, tilt = true, sound = false, label = 'Bookshelf' } = defineProps<{
  books: readonly Book[]; height?: number; coverRatio?: number; gap?: number; openGap?: number; tilt?: boolean; sound?: boolean; label?: string
}>()
const selected = defineModel<string | null>({ default: null })
const shelf = useTemplateRef('shelf')
let audio: AudioContext | undefined
let gesture: { start: number; origin: number; moved: boolean } | undefined
let ignoreClick = false
function select(id: string) {
  if (ignoreClick) { ignoreClick = false; return }
  selected.value = selected.value === id ? null : id
  if (!sound || !window.AudioContext) return
  audio ??= new AudioContext()
  void audio.resume().catch(() => {})
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.frequency.setValueAtTime(180, audio.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(65, audio.currentTime + .09)
  gain.gain.setValueAtTime(.06, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .11)
  oscillator.connect(gain).connect(audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + .12)
}
function key(event: KeyboardEvent, index: number) {
  const dest: Record<string, number> = { ArrowLeft: index - 1, ArrowUp: index - 1, ArrowRight: index + 1, ArrowDown: index + 1, Home: 0, End: books.length - 1 }
  if (event.key === 'Escape') selected.value = null
  if (!(event.key in dest)) return
  event.preventDefault()
  const buttons = shelf.value?.querySelectorAll('button')
  const next = Math.max(0, Math.min(books.length - 1, dest[event.key]!))
  if (selected.value && books[next]) selected.value = books[next].id
  nextTick(() => buttons?.[next]?.focus())
}
function point(event: PointerEvent, book: Book) {
  if (event.pointerType !== 'mouse' || !tilt || selected.value !== book.id) return
  const target = event.currentTarget as HTMLElement
  const bounds = target.getBoundingClientRect()
  target.style.setProperty('--tilt', `${((event.clientX - bounds.left) / bounds.width - .5) * 12}deg`)
}
function drag(event: PointerEvent) {
  if (!gesture || !shelf.value) return
  const delta = event.clientX - gesture.start
  if (Math.abs(delta) < 6 && !gesture.moved) return
  gesture.moved = true
  shelf.value.setPointerCapture(event.pointerId)
  shelf.value.scrollLeft = gesture.origin - delta
}
function release() { ignoreClick = gesture?.moved ?? false; gesture = undefined }
function ink(book: Book) {
  if (book.textColor) return book.textColor
  const hex = /^#([\da-f]{6})$/i.exec(book.color)?.[1]
  if (!hex) return '#fafaf9'
  const level = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16))
  return level[0]! * .2126 + level[1]! * .7152 + level[2]! * .0722 > 140 ? '#1c1917' : '#fafaf9'
}
onBeforeUnmount(() => { void audio?.close() })
</script>
<template>
  <div ref="shelf" class="shelf" role="group" :aria-label="label" :style="{ '--h': `${height}px`, '--cover': `${height * coverRatio}px`, '--gap': `${gap}px`, '--space': `${Math.max(0,openGap-gap)}px` }"
    @pointerdown="event => { if (event.button === 0) { ignoreClick = false; gesture = { start: event.clientX, origin: shelf?.scrollLeft ?? 0, moved: false } } }" @pointermove="drag" @pointerup="release" @pointercancel="release" @pointerleave="() => { if (!gesture?.moved) release() }">
    <div class="row">
      <button v-for="(book,index) in books" :key="book.id" type="button" :aria-label="book.author ? `${book.title} by ${book.author}` : book.title" :aria-pressed="selected === book.id" :style="{ '--spine': `${book.thickness ?? 40}px`, '--cloth': book.color, '--ink': ink(book) }" @click="select(book.id)" @keydown="key($event,index)" @pointermove="point($event,book)" @pointerleave="($event.currentTarget as HTMLElement).style.removeProperty('--tilt')">
        <span class="volume" aria-hidden="true"><span class="spine"><small>{{ book.author }}</small><b>{{ book.title }}</b></span><span class="cover"><img v-if="book.coverImage" :src="book.coverImage" alt=""><template v-else><b>{{ book.title }}</b><small>{{ book.author }}</small></template></span></span>
      </button>
    </div>
  </div>
</template>
<style scoped>
.shelf { overflow-x: auto; scrollbar-width: thin; width: 100%; touch-action: pan-y; padding-block: 2rem; user-select: none; } .row { display: flex; align-items: end; gap: var(--gap); width: max-content; margin-inline: auto; padding: .5rem 1.5rem; }
button { position: relative; width: var(--spine); height: var(--h); padding: 0; border: 0; background: transparent; perspective: 1600px; cursor: pointer; transition: width .48s cubic-bezier(.16,1,.3,1),margin .48s; }
button[aria-pressed=true] { width: var(--cover); margin-inline: var(--space); } .volume { position: absolute; inset: 0 auto 0 0; width: var(--spine); transform-style: preserve-3d; transform-origin: left center; transition: transform .5s cubic-bezier(.16,1,.3,1); }
button[aria-pressed=true] .volume { transform: translateZ(40px) rotateY(calc(-90deg + var(--tilt, 0deg))); }
.spine,.cover { position: absolute; box-sizing: border-box; inset: 0 auto auto 0; display: flex; width: var(--spine); height: var(--h); background: linear-gradient(90deg,#0003,transparent 12%,#fff1 72%,#0002), var(--cloth); color: var(--ink); overflow: hidden; border-radius: 2px; backface-visibility: hidden; }
.spine { writing-mode: vertical-rl; align-items: center; justify-content: space-between; padding: 1rem .25rem; font: 600 .85rem Georgia,serif; } .spine small { font: .55rem system-ui; letter-spacing: .06em; } .cover { transform-origin: left center; transform: rotateY(90deg); width: var(--cover); flex-direction: column; align-items: center; justify-content: space-between; padding: 1.3rem .65rem; text-align: center; }
.cover { transform: translateX(var(--spine)) rotateY(90deg); padding:1.25rem; align-items:start; text-align:start; } .cover b { font: 500 1.4rem/1.1 Georgia,serif; } .cover small { font: .65rem/1.3 system-ui; text-transform: uppercase; letter-spacing: .1em; } .cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
@media(hover:hover){button:not([aria-pressed=true]):hover .volume { transform: translateY(-8px) rotateX(5deg); }}
@media(prefers-reduced-motion:reduce){button,.volume { transition: none; } button:hover .volume { --tilt:0deg!important; }}
</style>
