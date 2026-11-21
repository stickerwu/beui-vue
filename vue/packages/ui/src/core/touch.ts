// Shared touch primitives. iOS and iPadOS run their own gestures on top of the
// page — the long-press selection callout and the selection it drags in with it
// — and they win: once the platform claims a touch it cancels ours mid-gesture.
// Surfaces that own their gesture have to opt out. The Vue ports express the
// `TOUCH_GESTURE_CLASS` utilities as these property sets, applied to the
// gesture surface's style.

/** Property set for a surface that *is* the control: a thumb, a drum, a stage. */
export const TOUCH_GESTURE_STYLE = {
  userSelect: 'none',
  webkitUserSelect: 'none',
  webkitTouchCallout: 'none',
} as const

export function capturePointer(element: Element, pointerId: number) {
  try {
    ;(element as HTMLElement & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(pointerId)
  } catch { /* the pointer already left the surface */ }
}

export function releasePointer(element: Element, pointerId: number) {
  try {
    ;(element as HTMLElement & { releasePointerCapture?: (id: number) => void }).releasePointerCapture?.(pointerId)
  } catch { /* the capture is already gone (pointercancel) */ }
}
