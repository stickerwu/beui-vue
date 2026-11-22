import { Comment, Fragment, cloneVNode, defineComponent, onBeforeUnmount, type VNode } from 'vue'
import { useContextRoot } from './context-shared'
import './menu.css'

const LONG_PRESS_DELAY = 520
const LONG_PRESS_TOLERANCE = 10

function firstElement(nodes: VNode[]): VNode | undefined {
  for (const node of nodes) {
    if (node.type === Comment) continue
    if (node.type === Fragment && Array.isArray(node.children)) {
      const inner = firstElement(node.children as VNode[])
      if (inner) return inner
      continue
    }
    return node
  }
  return undefined
}

/** Suppress selection on the element for the length of a press (`holdSelection` in lib/touch). */
function holdSelection(element: HTMLElement) {
  element.style.setProperty('user-select', 'none')
  element.style.setProperty('-webkit-user-select', 'none')
  return () => {
    element.style.removeProperty('user-select')
    element.style.removeProperty('-webkit-user-select')
  }
}

/**
 * The right-click / long-press / Shift+F10 target. Its single child keeps its
 * own markup. Port of `ContextMenuTrigger`.
 */
export default defineComponent({
  name: 'ContextMenuTriggerImpl',
  props: { disabled: { type: Boolean, default: false } },
  setup(props, { slots }) {
    const root = useContextRoot('ContextMenuTrigger')
    let timer: ReturnType<typeof setTimeout> | undefined
    let origin: { x: number; y: number } | null = null
    let releaseSelection: (() => void) | null = null

    function cancelLongPress() {
      if (timer) clearTimeout(timer)
      timer = undefined
      origin = null
    }
    // Held for the whole press, not just the timer: a gesture that turned into a
    // drag must not paint a selection under the finger either.
    function endPress() {
      cancelLongPress()
      releaseSelection?.()
      releaseSelection = null
    }
    onBeforeUnmount(endPress)

    return () => {
      const child = firstElement(slots.default?.() ?? [])
      if (!child) throw new Error('<ContextMenuTrigger> requires a single element')
      return cloneVNode(child, {
        ref: (node: unknown) => {
          const el = (node as { $el?: unknown } | null)?.$el ?? node
          root.triggerEl.value = el instanceof HTMLElement ? el : null
        },
        'aria-controls': root.open.value ? root.menuId : undefined,
        'aria-haspopup': 'menu',
        'aria-expanded': root.open.value,
        class: 'be-ctx-trigger',
        onContextmenu: (event: MouseEvent) => {
          if (event.defaultPrevented || props.disabled) return
          event.preventDefault()
          endPress()
          root.openAt({ x: event.clientX, y: event.clientY }, 'pointer')
        },
        onKeydown: (event: KeyboardEvent) => {
          if (event.defaultPrevented || props.disabled) return
          if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
          event.preventDefault()
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
          root.openAt({ x: rect.left + Math.min(24, rect.width / 2), y: rect.top + rect.height / 2 }, 'keyboard')
        },
        onPointerdown: (event: PointerEvent) => {
          // A pen presses the same way a finger does and gets no `contextmenu`
          // out of the platform for it, so it holds to open too.
          const pressToOpen = event.pointerType === 'touch' || event.pointerType === 'pen'
          if (event.defaultPrevented || props.disabled || !pressToOpen) return
          releaseSelection?.()
          releaseSelection = holdSelection(event.currentTarget as HTMLElement)
          const start = { x: event.clientX, y: event.clientY }
          origin = start
          timer = setTimeout(() => {
            root.openAt(start, 'touch')
            timer = undefined
            origin = null
          }, LONG_PRESS_DELAY)
        },
        onPointermove: (event: PointerEvent) => {
          if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > LONG_PRESS_TOLERANCE) cancelLongPress()
        },
        onPointerup: endPress,
        onPointercancel: endPress,
      }, true)
    }
  },
})
