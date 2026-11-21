<script lang="ts">
import { onMounted, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'

export type ThemeVariant = 'rectangle' | 'circle' | 'circle-blur' | 'blinds'

export type RectStart =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'bottom-up'

/** English defaults. Override per instance with `labels`. */
export const themeToggleMessages = {
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
}

export type ThemeToggleMessages = typeof themeToggleMessages

const VT_STYLE_ID = 'beui-theme-toggle-vt'

// View transitions animate in CSS, not motion springs, so easing here is
// either EASE_OUT_CSS or a keyword. The circle variants keep the Material
// standard curve because their reveal expands symmetrically rather than
// decelerating. Durations differ per variant to match native OS mode switches.
const VT_CSS = `
html[data-beui-vt="rect"]::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}
html[data-beui-vt="rect"]::view-transition-new(root) {
  mix-blend-mode: normal;
  animation: beui-rect-reveal 400ms ease-out;
}
html[data-beui-vt="circle"]::view-transition-old(root),
html[data-beui-vt="circle-blur"]::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}
html[data-beui-vt="circle"]::view-transition-new(root) {
  mix-blend-mode: normal;
  animation: beui-circle-reveal 700ms cubic-bezier(0.4, 0, 0.2, 1);
}
html[data-beui-vt="circle-blur"]::view-transition-new(root) {
  mix-blend-mode: normal;
  animation: beui-circle-blur-reveal 700ms cubic-bezier(0.4, 0, 0.2, 1);
}
html[data-beui-vt="blinds"]::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}
/* Slats: a masked band widens inside every 72px tile, so the new theme opens
   across the page like a shutter. The band edge has to be a registered custom
   property — mask-image itself is not animatable, but it re-resolves every
   frame the property ticks. mask-size fixes the tile at 72px rather than
   letting a repeating gradient's last stop define it, which is what keeps the
   20px soft edge from dragging the tile wider than the slat and leaving a
   feathered gap that never closes; it also means both ends land clean, fully
   transparent at -20px and fully opaque at 72px. Falling back to no mask
   (unregistered property, so the var is invalid) reveals the page in one
   step. */
@property --beui-vt-slat {
  syntax: "<length>";
  inherits: false;
  initial-value: 72px;
}
html[data-beui-vt="blinds"]::view-transition-new(root) {
  mix-blend-mode: normal;
  mask-image: linear-gradient(
    90deg,
    #000 0 var(--beui-vt-slat),
    transparent calc(var(--beui-vt-slat) + 20px)
  );
  mask-size: 72px 100%;
  mask-repeat: repeat;
  animation: beui-blinds-reveal 700ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes beui-rect-reveal {
  from { clip-path: var(--beui-vt-from, inset(100% 0 0 0)); }
  to   { clip-path: inset(0 0 0 0); }
}
@keyframes beui-circle-reveal {
  from { clip-path: circle(0% at var(--beui-vt-origin, 50% 100%)); }
  to   { clip-path: circle(150% at var(--beui-vt-origin, 50% 100%)); }
}
@keyframes beui-circle-blur-reveal {
  from { clip-path: circle(0% at var(--beui-vt-origin, 50% 100%)); filter: blur(8px); }
  to   { clip-path: circle(150% at var(--beui-vt-origin, 50% 100%)); filter: blur(0px); }
}
@keyframes beui-blinds-reveal {
  from { --beui-vt-slat: -20px; }
  to   { --beui-vt-slat: 72px; }
}
`

const RECT_FROM: Record<RectStart, string> = {
  'top-left': 'inset(0 100% 100% 0)',
  'top-right': 'inset(0 0 100% 100%)',
  'bottom-left': 'inset(100% 100% 0 0)',
  'bottom-right': 'inset(100% 0 0 100%)',
  center: 'inset(50% 50% 50% 50%)',
  'bottom-up': 'inset(100% 0 0 0)',
}

const CIRCLE_ORIGIN: Record<RectStart, string> = {
  'top-left': '0% 0%',
  'top-right': '100% 0%',
  'bottom-left': '0% 100%',
  'bottom-right': '100% 100%',
  center: '50% 50%',
  'bottom-up': '50% 100%',
}

// The theme belongs to the page, not to one button: every toggle shares one
// store, and the document's `.dark` class is the single source of truth (that
// is what the surrounding app writes and what CSS reads).
const rootDark = shallowRef(false)
let storeReady = false

function hasDocument() {
  return typeof document !== 'undefined'
}

function readDocumentDark() {
  return hasDocument() && document.documentElement.classList.contains('dark')
}

/** Applies a mode to the page. The class observer then reports it back. */
export function setThemeMode(dark: boolean) {
  if (!hasDocument()) return
  // Write the reactive value first: the class observer fires later and must see
  // its own write as already applied instead of echoing another change.
  rootDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

function ensureStore() {
  if (storeReady || typeof window === 'undefined') return
  storeReady = true
  rootDark.value = readDocumentDark()
  // The app (site chrome, another toggle, the OS) can change the theme too;
  // mirror it whenever the class changes.
  new MutationObserver(() => {
    const dark = readDocumentDark()
    if (dark !== rootDark.value) rootDark.value = dark
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
}

function ensureStyle() {
  if (!hasDocument() || document.getElementById(VT_STYLE_ID)) return
  const element = document.createElement('style')
  element.id = VT_STYLE_ID
  element.textContent = VT_CSS
  document.head.appendChild(element)
}

type ViewTransitionDocument = Document & {
  startViewTransition(callback: () => void): { finished: Promise<void> }
}

export function useThemeToggle(options: {
  variant?: MaybeRefOrGetter<ThemeVariant | undefined>
  start?: MaybeRefOrGetter<RectStart | undefined>
} = {}) {
  const reduce = useReducedMotion()
  const mounted = shallowRef(false)
  const isDark = computed(() => mounted.value && rootDark.value)

  onMounted(() => {
    ensureStore()
    ensureStyle()
    rootDark.value = readDocumentDark()
    mounted.value = true
  })

  /** Flips the page theme. Returns the mode it moved to. */
  const toggle = (): 'light' | 'dark' => {
    ensureStore()
    ensureStyle()
    const next: 'light' | 'dark' = rootDark.value ? 'light' : 'dark'
    const variant = toValue(options.variant) ?? 'rectangle'
    const start = toValue(options.start) ?? 'bottom-up'
    const doc = document as ViewTransitionDocument

    if (reduce.value || typeof doc.startViewTransition !== 'function') {
      setThemeMode(next === 'dark')
      return next
    }

    const root = document.documentElement

    if (variant === 'rectangle') {
      root.style.setProperty('--beui-vt-from', RECT_FROM[start])
      root.dataset.beuiVt = 'rect'
    } else if (variant === 'blinds') {
      // Slats sweep the whole viewport; there is no origin point to set.
      root.dataset.beuiVt = 'blinds'
    } else {
      root.style.setProperty('--beui-vt-origin', CIRCLE_ORIGIN[start])
      root.dataset.beuiVt = variant
    }

    const transition = doc.startViewTransition(() => setThemeMode(next === 'dark'))
    transition.finished.finally(() => { delete root.dataset.beuiVt })
    return next
  }

  return { isDark, mounted, reduce, toggle, rootDark }
}
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, watch } from 'vue'
import { easeOut, swapSpring } from '../core/motion'

const props = withDefaults(defineProps<{
  /** Animation variant. Default: "rectangle". */
  variant?: ThemeVariant
  /** Origin direction for the reveal. Default: "bottom-up". */
  start?: RectStart
  iconClassName?: string
  /** Override any built-in string. */
  labels?: Partial<ThemeToggleMessages>
  className?: string
  /** Controlled mode: `v-model:theme` ("light" | "dark"). */
  theme?: 'light' | 'dark'
}>(), { variant: 'rectangle', start: 'bottom-up' })

const emit = defineEmits<{
  'update:theme': [value: 'light' | 'dark']
  themeChange: [value: 'light' | 'dark']
}>()

defineSlots<{
  /** Replaces the sun/moon swap; receives the current mode. */
  icon?(props: { dark: boolean }): unknown
}>()

const text = computed(() => ({ ...themeToggleMessages, ...props.labels }))

const { isDark, mounted, reduce, toggle: runToggle } = useThemeToggle({
  get variant() { return props.variant },
  get start() { return props.start },
})

const label = computed(() => (mounted.value && isDark.value ? text.value.switchToLight : text.value.switchToDark))

// A controlled `v-model:theme` writes the page whenever the parent changes it.
// The toggle itself never writes back here: the view-transition callback runs
// after the old frame is captured, and a synchronous write would paint both
// frames in the new theme.
watch(() => props.theme, value => {
  if (value) setThemeMode(value === 'dark')
})

function toggle() {
  const next = runToggle()
  emit('update:theme', next)
  emit('themeChange', next)
}
</script>

<template>
  <button
    type="button"
    class="be-theme-toggle"
    :class="className"
    :aria-label="label"
    @click="toggle">
    <span v-if="mounted" class="be-theme-icon" :class="iconClassName">
      <slot name="icon" :dark="isDark">
        <AnimatePresence mode="popLayout" :initial="false">
          <motion.span
            :key="isDark ? 'dark' : 'light'"
            aria-hidden="true"
            class="be-theme-layer"
            :initial="reduce ? false : { opacity: 0, scale: 0.25, filter: 'blur(2px)' }"
            :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)' }"
            :exit="reduce ? undefined : { opacity: 0, scale: 0.25, filter: 'blur(2px)', transition: { duration: 0.16, ease: easeOut } }"
            :transition="reduce ? { duration: 0 } : swapSpring">
            <!-- Sun: the page is dark, so the button offers light. -->
            <svg v-if="isDark" class="be-theme-svg" :class="iconClassName" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
            </svg>
            <!-- Moon: the page is light, so the button offers dark. -->
            <svg v-else class="be-theme-svg" :class="iconClassName" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
            </svg>
          </motion.span>
        </AnimatePresence>
      </slot>
    </span>
    <span v-else :class="iconClassName" aria-hidden="true" />
  </button>
</template>

<style scoped>
.be-theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.be-theme-toggle:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }

/* Icons are single elements: the swap crossfades them in one grid cell. */
.be-theme-icon {
  position: relative;
  display: inline-grid;
  flex: none;
  place-items: center;
  overflow: hidden;
}
.be-theme-layer {
  grid-column: 1;
  grid-row: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  will-change: opacity, filter, transform;
}
.be-theme-svg { display: block; width: 1.5rem; height: 1.5rem; }

@media (prefers-reduced-motion: reduce) {
  .be-theme-layer { will-change: auto; }
}
</style>
