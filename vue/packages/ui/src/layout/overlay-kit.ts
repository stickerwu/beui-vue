import { nextTick, onMounted, watch } from 'vue'

/** Vaul-style glide shared by the sheet and its scrim. Mirrors `EASE_DRAWER` in `lib/ease.ts`. */
export const easeDrawer = [0.32, 0.72, 0, 1] as const

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/** Elements inside `container` that Tab can reach, in DOM order. */
export function focusablesIn(container: Element | null | undefined) {
  return Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    .filter(element => element.tabIndex >= 0 && !element.closest('[inert]'))
}

/** A template ref to a motion component or a plain element, as the DOM element. */
export function elementOf(target: unknown): HTMLElement | null {
  if (!target) return null
  const node = (target as { $el?: unknown }).$el ?? target
  return node instanceof HTMLElement ? node : null
}

/**
 * Open traps, innermost last. Only the innermost one answers Tab, Escape and
 * stray focus, so a sheet opened from inside a drawer is not fought for focus.
 */
const traps: object[] = []

/**
 * Safari (macOS and iOS) does not focus a button, link or checkbox when it is
 * clicked or tapped, so at the moment an overlay opens `document.activeElement`
 * is `<body>` and there is nothing to hand focus back to. The last pointer press
 * target stands in for it. Every press records its nearest focusable ancestor
 * (or null), so a press on plain content never revives an older opener.
 */
let pressed: HTMLElement | null = null
let tracking = false
function trackPresses() {
  if (tracking) return
  tracking = true
  document.addEventListener('pointerdown', event => {
    pressed = event.target instanceof Element ? event.target.closest<HTMLElement>(FOCUSABLE) : null
  }, true)
}

/** The element that should get focus back when an overlay closes. */
function focusOpener(): HTMLElement | null {
  const active = document.activeElement
  const opener = pressed?.isConnected ? pressed : null
  // Safari leaves focus on `<body>`, or on the nearest focusable ancestor of the pressed control
  // (a `tabindex="-1"` wrapper), neither of which is the opener.
  if (opener && (!(active instanceof HTMLElement) || active === document.body || (active !== opener && active.contains(opener)))) return opener
  return active instanceof HTMLElement && active !== document.body ? active : null
}

/**
 * Moves focus into the panel when `open` turns true, keeps Tab cycling inside
 * it, pulls focus back if it lands outside, and returns focus to whatever held
 * it before opening once `open` turns false. Port of `useFocusTrap`.
 */
export function useFocusTrap(open: () => boolean, panel: () => HTMLElement | null, options: { onEscape?: () => void } = {}) {
  onMounted(() => {
    trackPresses()
    watch(open, async (isOpen, _, onCleanup) => {
      if (!isOpen) return
      await nextTick()
      const element = panel()
      if (!element) return
      const self = {}
      traps.push(self)
      const innermost = () => traps[traps.length - 1] === self
      const returnFocus = focusOpener()
      const focusFirst = () => (focusablesIn(element)[0] ?? element).focus({ preventScroll: true })
      if (!element.contains(document.activeElement)) focusFirst()

      const onFocus = (event: FocusEvent) => {
        if (!innermost() || element.closest('[inert]')) return
        if (event.target instanceof Node && !element.contains(event.target)) focusFirst()
      }
      const onKey = (event: KeyboardEvent) => {
        if (!innermost() || event.defaultPrevented) return
        if (event.key === 'Escape' && options.onEscape) {
          event.preventDefault()
          options.onEscape()
          return
        }
        if (event.key !== 'Tab') return
        const elements = focusablesIn(element)
        const first = elements[0]
        const last = elements[elements.length - 1]
        const active = document.activeElement
        if (!first || !last) {
          event.preventDefault()
          element.focus({ preventScroll: true })
        } else if (event.shiftKey && (active === first || active === element)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
      }
      document.addEventListener('focusin', onFocus)
      document.addEventListener('keydown', onKey)
      onCleanup(() => {
        document.removeEventListener('focusin', onFocus)
        document.removeEventListener('keydown', onKey)
        traps.splice(traps.indexOf(self), 1)
        if (returnFocus?.isConnected && !returnFocus.closest('[inert]')) returnFocus.focus({ preventScroll: true })
      })
    }, { immediate: true, flush: 'post' })
  })
}

/** Hides page scroll while `open`. `fixed` also pins the body, which iOS Safari needs to hold the lock. */
export function useBodyLock(open: () => boolean, mode: 'overflow' | 'fixed' = 'overflow') {
  onMounted(() => {
    watch(open, (isOpen, _, onCleanup) => {
      if (!isOpen) return
      const body = document.body
      const scrollY = window.scrollY
      const previous = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, overflow: body.style.overflow }
      if (mode === 'fixed') {
        body.style.position = 'fixed'
        body.style.top = `-${scrollY}px`
        body.style.left = '0'
        body.style.right = '0'
      }
      body.style.overflow = 'hidden'
      onCleanup(() => {
        Object.assign(body.style, previous)
        if (mode === 'fixed') window.scrollTo(0, scrollY)
      })
    }, { immediate: true })
  })
}
