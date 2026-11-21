import { Comment, Fragment, cloneVNode, defineComponent, type VNode } from 'vue'
import { useRoot } from './menu-shared'

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

/**
 * Makes its single child the menu trigger: the child keeps its own markup and
 * gains the ARIA state, `data-state` and the open handlers. Port of
 * `DropdownMenuTrigger`.
 */
export default defineComponent({
  name: 'DropdownMenuTrigger',
  props: { disabled: { type: Boolean, default: false } },
  setup(props, { slots }) {
    const root = useRoot('DropdownMenuTrigger')
    return () => {
      const child = firstElement(slots.default?.() ?? [])
      if (!child) throw new Error('<DropdownMenuTrigger> requires a single element')
      return cloneVNode(child, {
        ref: (node: unknown) => {
          const el = (node as { $el?: unknown } | null)?.$el ?? node
          root.triggerEl.value = el instanceof HTMLElement ? el : null
        },
        id: (child.props?.id as string | undefined) ?? root.triggerId,
        'aria-haspopup': 'menu',
        'aria-expanded': root.open.value,
        'aria-controls': root.open.value ? root.menuId : undefined,
        'data-state': root.open.value ? 'open' : 'closed',
        onClick: (event: MouseEvent) => {
          if (event.defaultPrevented || props.disabled) return
          // `detail` is 0 for a click the keyboard synthesized from Enter or Space:
          // that opener wants the first row, a pointer wants no row picked yet.
          root.setOpen(!root.open.value, event.detail === 0 ? 'first' : 'panel')
        },
        onKeydown: (event: KeyboardEvent) => {
          if (event.defaultPrevented || props.disabled) return
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            root.setOpen(true, event.key === 'ArrowDown' ? 'first' : 'last')
          }
        },
      }, true)
    }
  },
})
