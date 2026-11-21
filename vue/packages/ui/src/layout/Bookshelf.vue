<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const bookshelfMessages = {
  label: 'Bookshelf',
  book: '{title}',
  bookWithAuthor: '{title} by {author}',
}
export type BookshelfMessages = typeof bookshelfMessages

export interface BookshelfBook {
  id: string
  title: string
  author?: string
  /** Cloth color of the spine and cover. Any CSS color. */
  color: string
  /** Text color on the spine and cover. Defaults to black or white, picked
   * from `color` when it is a hex value, else white. */
  textColor?: string
  /** Front cover image. Without one, the cover is typeset from the title and author. */
  coverImage?: string
  /** Spine width in px. */
  thickness?: number
}

/** Text that reads on `color`: near-black on a light cloth, near-white on a dark one. */
export function readableText(color: string) {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1]
  if (!hex) return '#ffffff'
  const full = hex.length === 3 ? hex.split('').map(character => character + character).join('') : hex
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map(index => Number.parseInt(full.slice(index, index + 2), 16) / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.55 ? '#1c1917' : '#fafaf9'
}
</script>

<script setup lang="ts">
import { animate, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { easeOut, mouseSpring } from '../core/motion'
import { useMountedMedia } from '../core/mounted-media'
import { createBookSounds, type BookSounds } from './book-sounds'

const props = withDefaults(defineProps<{
  books: readonly BookshelfBook[]
  /** Book height in px. */
  height?: number
  /** Cover width as a fraction of the height. */
  coverRatio?: number
  /** Space between closed books in px. */
  gap?: number
  /** Extra space on each side of the open book in px. */
  openGap?: number
  /** Tilt the open cover toward the mouse. Mouse only, off with reduced motion. */
  tilt?: boolean
  /** Play a slide as a book comes out or goes back, and a soft tap as the
   * mouse runs along the spines. Default false. */
  sound?: boolean
  /** Accessible name of the shelf. */
  label?: string
  labels?: Partial<BookshelfMessages>
}>(), { height: 300, coverRatio: 0.68, gap: 3, openGap: 16, tilt: true, sound: false })
const openId = defineModel<string | null>({ default: null })
const emit = defineEmits<{ valueChange: [id: string | null] }>()

const t = computed(() => ({ ...bookshelfMessages, ...props.labels }))
// Reduced motion feeds the rendered markup (the flat cover, the paint order),
// so read it only once mounted: the server cannot know it, and a value that
// flips during hydration would mismatch. The first client frame renders the
// moving layout, then settles instantly into the still one.
const reduce = useMountedMedia('(prefers-reduced-motion: reduce)')
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')

// A book turning in 3D reads as a physical object, so it gets a little more
// time than a UI transition. EASE_OUT front-loads most of each move.
// Opening pulls the book forward first and turns it a beat later; closing
// turns it back first and pushes it in a beat later, so the exit mirrors the
// entry.
const PULL = { duration: 0.42, ease: easeOut } as const
const TURN = { duration: 0.5, ease: easeOut } as const
const LAG = 0.08
const INSTANT = { duration: 0 } as const
const FADE = { duration: 0.2, ease: easeOut } as const

const DEFAULT_THICKNESS = 40
const PERSPECTIVE = 1600
// How far the open book comes toward the viewer, past the spines.
const PULL_DEPTH = 40
// Hover: a finger hooks the top of the spine, lifts it and tips it out a little.
const HOVER_LIFT = 8
const HOVER_DEPTH = 10
const HOVER_TIP = 5
// Largest cursor tilt of the open cover, in degrees.
const MAX_TILT = 6
// Shade at the far end of a turn: a face turned side-on to the viewer.
const SIDE_SHADE = 0.5
// A drag starts after this many px sideways, so a tap stays a tap.
const DRAG_SLOP = 6
// How far a released drag keeps gliding: velocity (px/s) times this.
const FLING = 0.22
// Past either end, the row follows the finger at this fraction.
const RUBBER = 0.3

// --- Sounds ---------------------------------------------------------------
// Created on first use, so a silent shelf never touches Web Audio.
let soundsRef: BookSounds | null = null
function sounds() {
  if (!props.sound) return null
  soundsRef ??= createBookSounds()
  return soundsRef
}
onBeforeUnmount(() => {
  soundsRef?.dispose()
  soundsRef = null
})

// --- Layout ---------------------------------------------------------------
type Layout = { slots: number[]; width: number }
function layoutShelf(books: readonly BookshelfBook[], openIndex: number, cover: number, gap: number, openGap: number): Layout {
  const slots: number[] = []
  let x = 0
  books.forEach((book, index) => {
    const open = index === openIndex
    if (index > 0) x += open || index - 1 === openIndex ? openGap : gap
    slots.push(x)
    x += open ? cover : (book.thickness ?? DEFAULT_THICKNESS)
  })
  return { slots, width: x }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const cover = computed(() => Math.round(props.height * props.coverRatio))
const openIndex = computed(() => props.books.findIndex(book => book.id === openId.value))
const closed = computed(() => layoutShelf(props.books, -1, cover.value, props.gap, props.openGap))
const shelf = computed(() => layoutShelf(props.books, openIndex.value, cover.value, props.gap, props.openGap))

// The book that just closed keeps painting above its neighbours until it is
// back on the shelf, so it never slips under them mid-turn.
const closingId = shallowRef<string | null>(null)

// --- Frame measurement ----------------------------------------------------
const frame = useTemplateRef<HTMLDivElement>('frame')
const frameWidth = shallowRef(0)
let frameObserver: ResizeObserver | undefined
onMounted(() => {
  const element = frame.value
  if (!element) return
  frameWidth.value = element.clientWidth
  frameObserver = new ResizeObserver(entries => { frameWidth.value = entries[0]?.contentRect.width ?? element.clientWidth })
  frameObserver.observe(element)
})
onBeforeUnmount(() => frameObserver?.disconnect())

// Fit the closed shelf to the container; an open book that no longer fits
// pans the row so it stays in view.
const fit = computed(() => (frameWidth.value ? Math.min(1, frameWidth.value / closed.value.width) : 1))
const visible = computed(() => (frameWidth.value ? frameWidth.value / fit.value : shelf.value.width))
// Static per width, so the fade doesn't pop in and out as books open.
const canOverflow = computed(() => frameWidth.value > 0 && closed.value.width + cover.value + 2 * props.openGap > visible.value)
const overflowing = computed(() => openIndex.value >= 0 && shelf.value.width > visible.value)

const rowX = computed(() => {
  if (!overflowing.value) return -shelf.value.width / 2
  const centre = (shelf.value.slots[openIndex.value] ?? 0) + cover.value / 2
  return clamp(-centre, visible.value / 2 - shelf.value.width, -visible.value / 2)
})

// --- Pan (swipe) ----------------------------------------------------------
// Swipe (or scroll sideways) to see books cut off by the edges. The pan rides
// on top of the automatic centring and resets when a book opens.
const pan = useMotionValue(0)
const panMin = computed(() => (overflowing.value ? visible.value / 2 - shelf.value.width - rowX.value : 0))
const panMax = computed(() => (overflowing.value ? -visible.value / 2 - rowX.value : 0))
const panRange = computed(() => ({ min: panMin.value, max: panMax.value, fit: fit.value }))

let panAnimation: { stop: () => void } | undefined
onBeforeUnmount(() => panAnimation?.stop())
// Re-centre on every open, close or switch; the row's own move runs on the
// same timing, so the two read as one.
function recentre() {
  panAnimation?.stop()
  panAnimation = undefined
  if (pan.get() === 0) return
  panAnimation = animate(pan, 0, reduce.value ? INSTANT : TURN)
}
watch(openId, (next, previous) => {
  closingId.value = previous ?? null
  recentre()
})

let drag: { id: number; x: number; y: number; pan: number; dragging: boolean; lastX: number; lastT: number; vx: number } | null = null
let swallowClick = false

function pointerDown(event: PointerEvent) {
  swallowClick = false
  // Browsers only start audio from a gesture; unlock it on the first press.
  sounds()?.prepare()
  if (!overflowing.value) return
  pan.stop()
  drag = {
    id: event.pointerId, x: event.clientX, y: event.clientY, pan: pan.get(),
    dragging: false, lastX: event.clientX, lastT: performance.now(), vx: 0,
  }
}
function pointerMove(event: PointerEvent) {
  const current = drag
  if (!current || current.id !== event.pointerId) return
  const dx = event.clientX - current.x
  if (!current.dragging) {
    if (Math.abs(dx) < DRAG_SLOP || Math.abs(dx) < Math.abs(event.clientY - current.y)) return
    current.dragging = true
    try { frame.value?.setPointerCapture(event.pointerId) } catch { /* pointer already gone */ }
  }
  const { min, max, fit: scale } = panRange.value
  const raw = current.pan + dx / scale
  const over = raw > max ? raw - max : raw < min ? raw - min : 0
  pan.set(raw - over + over * RUBBER)
  const now = performance.now()
  const dt = now - current.lastT
  if (dt > 0) current.vx = ((event.clientX - current.lastX) / dt) * 1000
  current.lastX = event.clientX
  current.lastT = now
}
function pointerUp(event: PointerEvent) {
  const current = drag
  if (!current || current.id !== event.pointerId) return
  drag = null
  if (!current.dragging) return
  try { if (frame.value?.hasPointerCapture(event.pointerId)) frame.value.releasePointerCapture(event.pointerId) } catch { /* dropped */ }
  swallowClick = true
  const { min, max, fit: scale } = panRange.value
  const target = clamp(pan.get() + (current.vx * FLING) / scale, min, max)
  if (reduce.value) pan.set(target)
  else panAnimation = animate(pan, target, TURN)
}
function wheel(event: WheelEvent) {
  if (!overflowing.value || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
  pan.stop()
  const { min, max, fit: scale } = panRange.value
  pan.set(clamp(pan.get() - event.deltaX / scale, min, max))
}
function clickCapture(event: MouseEvent) {
  // A swipe that ends on a book must not open it.
  if (!swallowClick) return
  swallowClick = false
  event.preventDefault()
  event.stopPropagation()
}

// --- Open / close ---------------------------------------------------------
// Buttons are tracked by book id: a v-for template ref array is not ordered
// reliably, and the arrow keys need each button's index.
const buttonRefs = new Map<string, HTMLButtonElement>()
function setButton(element: Element | { $el?: unknown } | null, id: string) {
  const node = element && '$el' in element ? element.$el : element
  if (node instanceof HTMLButtonElement) buttonRefs.set(id, node)
  else buttonRefs.delete(id)
}

function setOpen(id: string | null) {
  if (id === openId.value) return
  openId.value = id
  emit('valueChange', id)
  // A switch plays only the new book's slide; two at once is noise.
  if (id === null) sounds()?.push()
  else sounds()?.pull()
}
function toggle(book: BookshelfBook, index: number) {
  setOpen(index === openIndex.value ? null : book.id)
}

const hoverId = shallowRef<string | null>(null)
function hover(book: BookshelfBook, index: number, over: boolean) {
  if (over) hoverId.value = book.id
  else if (hoverId.value === book.id) hoverId.value = null
  if (over && index !== openIndex.value) sounds()?.tap()
}

// Neighbours make room as the open book turns, so they share its lag.
const slide = computed(() => (reduce.value ? INSTANT : { ...TURN, delay: openIndex.value >= 0 ? LAG : 0 }))

function keys(event: KeyboardEvent) {
  const target = event.target as Node | null
  if (!target) return
  const index = props.books.findIndex(book => buttonRefs.get(book.id) === target)
  if (index < 0) return
  let next = index
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index + 1
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index - 1
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = props.books.length - 1
  else if (event.key === 'Escape' && openId.value !== null) {
    event.preventDefault()
    setOpen(null)
    return
  } else return
  event.preventDefault()
  next = clamp(next, 0, props.books.length - 1)
  const nextBook = props.books[next]
  if (!nextBook) return
  buttonRefs.get(nextBook.id)?.focus()
  // Browsing with a book open keeps one open, like pulling the next one out.
  if (openId.value !== null) setOpen(nextBook.id)
}

const name = (book: BookshelfBook) => (book.author
  ? t.value.bookWithAuthor.replace('{title}', book.title).replace('{author}', book.author)
  : t.value.book.replace('{title}', book.title))

// --- Per-book tilt springs ------------------------------------------------
// Springs live outside the loop so a book keeps its lean when it re-renders,
// and are reset when a book can no longer tilt (closed, touch, reduced motion).
type Tilt = { x: MotionValue<number>; y: MotionValue<number> }
const tilts = new Map<string, Tilt>()
function tiltFor(book: BookshelfBook) {
  let tilt = tilts.get(book.id)
  if (!tilt) {
    tilt = { x: useSpring(0, mouseSpring), y: useSpring(0, mouseSpring) }
    tilts.set(book.id, tilt)
  }
  return tilt
}
function canTilt(index: number) {
  return props.tilt && canHover.value && !reduce.value && index === openIndex.value
}
watch([openIndex, () => props.tilt, canHover, reduce], () => {
  for (const [id, tilt] of tilts) {
    const index = props.books.findIndex(book => book.id === id)
    if (index >= 0 && canTilt(index)) continue
    tilt.x.set(0)
    tilt.y.set(0)
  }
})
// Springs are made with the component rather than mid-render, so their
// follow watchers belong to the component's scope and stop with it.
function warmTilts() {
  for (const book of props.books) {
    if (tilts.has(book.id)) continue
    tilts.set(book.id, { x: useSpring(0, mouseSpring), y: useSpring(0, mouseSpring) })
  }
}
warmTilts()
watch(() => props.books.length, warmTilts)

function resetTilt(book: BookshelfBook) {
  const tilt = tilts.get(book.id)
  if (!tilt) return
  tilt.x.set(0)
  tilt.y.set(0)
}
function moveTilt(event: PointerEvent, book: BookshelfBook, index: number) {
  if (!canTilt(index) || event.pointerType !== 'mouse') return
  // The hit button lies flat over the open cover, so its box is the cover's.
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (!box.width) return
  const tilt = tiltFor(book)
  const px = clamp((event.clientX - box.left) / box.width, 0, 1)
  const py = clamp((event.clientY - box.top) / box.height, 0, 1)
  tilt.y.set((px - 0.5) * 2 * MAX_TILT)
  tilt.x.set((0.5 - py) * 2 * MAX_TILT)
}

// --- Faces ----------------------------------------------------------------
// Each face darkens as it turns side-on to the viewer and lights up as it
// comes round to face them, tied to the angle, so it stays in step when a
// turn is interrupted. The same angle decides paint order: while the cover is
// more than half turned toward the viewer the book is in front of its
// neighbours, so it paints over them (the open book over a closing one).
interface Face {
  angle: ReturnType<typeof useMotionValue<number>>
  coverShade: ReturnType<typeof useTransform<number, number>>
  spineShade: ReturnType<typeof useTransform<number, number>>
  frontZ: ReturnType<typeof useTransform<number, number>>
  backZ: MotionValue<number>
}
const faces = new Map<string, Face>()
function faceFor(book: BookshelfBook): Face {
  const existing = faces.get(book.id)
  if (existing) return existing
  const turned = openIndex.value >= 0 && props.books[openIndex.value]?.id === book.id && !reduce.value
  const angle = useMotionValue(turned ? -90 : 0)
  const face: Face = {
    angle,
    coverShade: useTransform(angle, [-90, 0], [0, SIDE_SHADE]),
    spineShade: useTransform(angle, [-90, 0], [SIDE_SHADE, 0]),
    frontZ: useTransform(angle, value => (value < -45 ? 3 : 1)) as MotionValue<number>,
    backZ: useTransform(angle, value => (value < -45 ? 2 : 1)) as MotionValue<number>,
  }
  faces.set(book.id, face)
  return face
}
// Same as the tilt springs: build every book's angle values up front.
function warmFaces() {
  for (const book of props.books) faceFor(book)
}
warmFaces()
watch(() => props.books.length, warmFaces)

function isOpenBook(book: BookshelfBook) {
  return openIndex.value >= 0 && props.books[openIndex.value]?.id === book.id
}
function zIndex(book: BookshelfBook) {
  // Reduced motion never turns: the flat open cover simply sits on top.
  if (reduce.value) return isOpenBook(book) ? 3 : 1
  if (isOpenBook(book)) return faceFor(book).frontZ
  if (book.id === closingId.value) return faceFor(book).backZ
  return 1
}
function coverOpacity(book: BookshelfBook) {
  return reduce.value && !isOpenBook(book) ? 0 : 1
}
function spineHidden(book: BookshelfBook) {
  return reduce.value && isOpenBook(book)
}
function settled(book: BookshelfBook) {
  if (book.id === closingId.value && !isOpenBook(book)) closingId.value = null
}
function pullTarget(book: BookshelfBook, index: number) {
  const isOpen = index === openIndex.value
  const turned = isOpen && !reduce.value
  const lifted = canHover.value && hoverId.value === book.id && !isOpen && !reduce.value
  return { y: lifted ? -HOVER_LIFT : 0, z: turned ? PULL_DEPTH : lifted ? HOVER_DEPTH : 0, rotateX: lifted ? -HOVER_TIP : 0 }
}
function turnTarget(book: BookshelfBook, index: number) {
  const isOpen = index === openIndex.value
  const turned = isOpen && !reduce.value
  // Offset that keeps the turned book's cover inside its slot and level with
  // the spines: the box turns around its middle, then shifts by this much.
  const turn = (cover.value - (book.thickness ?? DEFAULT_THICKNESS)) / 2
  return { x: turned ? turn : 0, z: turned ? turn : 0, rotateY: turned ? -90 : 0 }
}
function trackAngle(book: BookshelfBook, latest: Record<string, unknown>) {
  const value = Number.parseFloat(String(latest.rotateY))
  if (!Number.isNaN(value)) faceFor(book).angle.set(value)
}
</script>

<template>
  <div ref="frame" class="be-shelf" :class="{ 'be-shelf-fade': canOverflow }" :style="{ height: `${(height + 64) * fit}px` }"
    @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerUp"
    @wheel="wheel" @click.capture="clickCapture">
    <div class="be-shelf-scale" :style="{ height: `${height}px`, marginTop: `${-height / 2}px`, transform: `scale(${fit})` }">
      <!-- Flat on purpose: each book is its own 3D scene, painted in z-index
           order, so an open book always sits in front of its neighbours. -->
      <ul class="be-shelf-row" :aria-label="t.label" :style="{ height: `${height}px`, perspective: `${PERSPECTIVE}px`, perspectiveOrigin: '0 50%' }" @keydown="keys">
        <motion.li v-for="(book, index) in books" :key="book.id" class="be-book"
          :style="{ width: `${book.thickness ?? DEFAULT_THICKNESS}px`, height: `${height}px`, zIndex: zIndex(book) }"
          :initial="false" :animate="{ x: rowX + (shelf.slots[index] ?? 0) }" :transition="slide">
          <motion.span class="be-book-pan" :style="{ x: pan }">
            <span aria-hidden="true" class="be-book-visual">
              <!-- Pull: off the shelf toward the viewer, or a lift and tip on hover. -->
              <motion.span class="be-book-pull"
                :style="{ width: `${book.thickness ?? DEFAULT_THICKNESS}px`, height: `${height}px`, transformOrigin: '50% 100% 0' }"
                :initial="false" :animate="pullTarget(book, index)"
                :transition="reduce ? INSTANT : { ...PULL, delay: closingId === book.id && index !== openIndex ? LAG : 0 }"
                @animation-complete="settled(book)">
                <!-- A soft pool under the open book that spreads as it comes off the shelf. -->
                <motion.span class="be-book-shadow" aria-hidden="true"
                  :style="{ top: `${height - 12}px`, width: `${cover}px`, height: '28px', z: -2 }"
                  :initial="false"
                  :animate="{ opacity: index === openIndex ? 1 : 0, scaleX: index === openIndex || reduce ? 1 : 0.6 }"
                  :transition="reduce ? FADE : PULL" />
                <!-- Tilt: the open cover leans toward the mouse. -->
                <motion.span class="be-book-tilt"
                  :style="{ width: `${book.thickness ?? DEFAULT_THICKNESS}px`, height: `${height}px`, rotateX: tiltFor(book).x, rotateY: tiltFor(book).y, transformOrigin: `${cover / 2}px 50% 0` }">
                  <!-- Turn: spine to cover, around the middle of the book. -->
                  <motion.span class="be-book-turn"
                    :style="{ width: `${book.thickness ?? DEFAULT_THICKNESS}px`, height: `${height}px`, transformOrigin: `${(book.thickness ?? DEFAULT_THICKNESS) / 2}px 50% ${-cover / 2}px` }"
                    :initial="false" :animate="turnTarget(book, index)"
                    :transition="reduce ? INSTANT : { ...TURN, delay: index === openIndex ? LAG : 0 }"
                    @update="latest => trackAngle(book, latest as Record<string, unknown>)">
                    <motion.span class="be-book-spine be-book-face-focus"
                      :style="{ width: `${book.thickness ?? DEFAULT_THICKNESS}px`, height: `${height}px`, backgroundColor: book.color, color: book.textColor ?? readableText(book.color) }"
                      :initial="false" :animate="{ opacity: spineHidden(book) ? 0 : 1 }" :transition="FADE">
                      <span class="be-book-spine-rim" aria-hidden="true" />
                      <span class="be-book-spine-rule be-book-spine-rule-top" aria-hidden="true" />
                      <span class="be-book-spine-rule be-book-spine-rule-bottom" aria-hidden="true" />
                      <span v-if="book.author" class="be-book-spine-author">{{ book.author }}</span>
                      <span class="be-book-spine-title">{{ book.title }}</span>
                      <motion.span v-if="!reduce" class="be-book-shade" aria-hidden="true" :style="{ opacity: faceFor(book).spineShade }" />
                    </motion.span>
                    <motion.span class="be-book-cover be-book-face-focus"
                      :style="{
                        width: `${cover}px`, height: `${height}px`, backgroundColor: book.color, color: book.textColor ?? readableText(book.color),
                        transformOrigin: '0 50%', transform: reduce ? 'none' : `translateX(${book.thickness ?? DEFAULT_THICKNESS}px) rotateY(90deg)`,
                      }"
                      :initial="false" :animate="{ opacity: coverOpacity(book) }" :transition="FADE">
                      <img v-if="book.coverImage" :src="book.coverImage" alt="" draggable="false" class="be-book-cover-image" />
                      <template v-else>
                        <span class="be-book-cover-title">{{ book.title }}</span>
                        <span v-if="book.author" class="be-book-cover-author">{{ book.author }}</span>
                      </template>
                      <span class="be-book-hinge" aria-hidden="true" />
                      <motion.span v-if="!reduce" class="be-book-shade" aria-hidden="true" :style="{ opacity: faceFor(book).coverShade }" />
                    </motion.span>
                  </motion.span>
                </motion.span>
              </motion.span>
            </span>
            <!-- The book is picture only. A browser hit-tests a 3D-turned cover
                 only inside its parent's box, which is the spine's, so the open
                 cover would ignore most clicks. A flat button over the book's
                 footprint (spine closed, cover open) takes the input instead. -->
            <button :ref="element => setButton(element, book.id)" type="button" class="be-book-hit"
              :aria-label="name(book)" :aria-pressed="index === openIndex"
              :style="{ width: `${index === openIndex ? cover : (book.thickness ?? DEFAULT_THICKNESS)}px`, height: `${height}px` }"
              @click="toggle(book, index)"
              @pointerenter="event => event.pointerType === 'mouse' && hover(book, index, true)"
              @pointerleave="hover(book, index, false); resetTilt(book)"
              @pointermove="moveTilt($event, book, index)" />
          </motion.span>
        </motion.li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.be-shelf { position: relative; width: 100%; touch-action: pan-y; user-select: none; -webkit-touch-callout: none; clip-path: inset(0); }
.be-shelf-fade { mask-image: linear-gradient(90deg, transparent, #000 28px, #000 calc(100% - 28px), transparent); }
.be-shelf-scale { position: absolute; top: 50%; left: 50%; width: 0; transform-origin: 0 50%; }
.be-shelf-row { position: absolute; top: 0; left: 0; margin: 0; padding: 0; width: 0; list-style: none; transform-style: preserve-3d; }
.be-book { position: absolute; top: 0; left: 0; transform-style: preserve-3d; margin: 0; }
.be-book-pan,
.be-book-visual,
.be-book-pull,
.be-book-tilt,
.be-book-turn { position: absolute; top: 0; left: 0; display: block; transform-style: preserve-3d; }
.be-book-pan { inset: 0; }
.be-book-visual { inset: 0; pointer-events: none; }
.be-book-shadow { pointer-events: none; position: absolute; left: 0; display: block; background: radial-gradient(closest-side, rgb(0 0 0 / .42), rgb(0 0 0 / 0)); }
.be-book-spine,
.be-book-cover { position: absolute; top: 0; left: 0; display: flex; box-sizing: border-box; overflow: hidden; backface-visibility: hidden; }
.be-book-spine { flex-direction: column; align-items: center; padding: .75rem 0; border-radius: 2px; }
.be-book-spine-rim { pointer-events: none; position: absolute; inset: 0; background: linear-gradient(90deg, rgb(0 0 0 / .28), rgb(255 255 255 / .14) 28%, rgb(255 255 255 / 0) 55%, rgb(0 0 0 / .22)); }
.be-book-spine-rule { pointer-events: none; position: absolute; left: 0; right: 0; height: 1px; background: currentColor; opacity: .3; }
.be-book-spine-rule-top { top: .5rem; }
.be-book-spine-rule-bottom { bottom: .5rem; }
.be-book-spine-author { position: relative; max-height: 30%; min-height: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-geist, ui-sans-serif, system-ui, sans-serif); font-size: 9px; text-transform: uppercase; letter-spacing: .14em; opacity: .75; writing-mode: vertical-rl; }
.be-book-spine-title { position: relative; margin-top: .75rem; min-height: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; line-height: 1; writing-mode: vertical-rl; }
.be-book-cover { flex-direction: column; justify-content: space-between; padding: 1.25rem; text-align: left; border-radius: 2px 3px 3px 2px; }
.be-book-cover-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.be-book-cover-title { position: relative; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; font-family: Georgia, 'Times New Roman', serif; font-size: 1.25rem; line-height: 1.25; }
.be-book-cover-author { position: relative; font-family: var(--font-geist, ui-sans-serif, system-ui, sans-serif); font-size: 10px; text-transform: uppercase; letter-spacing: .14em; opacity: .75; }
.be-book-hinge { pointer-events: none; position: absolute; inset: 0; background: linear-gradient(90deg, rgb(0 0 0 / .35), rgb(255 255 255 / .1) 3%, rgb(0 0 0 / .12) 5%, rgb(0 0 0 / 0) 9%); }
.be-book-shade { pointer-events: none; position: absolute; inset: 0; display: block; background: #000; }
.be-book-hit { position: absolute; top: 0; left: 0; padding: 0; border: 0; background: transparent; outline: none; cursor: pointer; }
.be-book:has(.be-book-hit:focus-visible) .be-book-face-focus { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
</style>
