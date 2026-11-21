<script lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { defineComponent, h, isVNode, mergeProps, shallowRef, useId, type PropType, type VNode, Comment, Fragment, Text } from 'vue'
import { layoutSpring } from '../core/motion'

/** Flatten fragments (`v-for`, `<template>`) and drop comments, whitespace and text so only real items remain. */
function items(nodes: VNode[]): VNode[] {
  const out: VNode[] = []
  for (const node of nodes) {
    if (!isVNode(node) || node.type === Comment) continue
    if (node.type === Fragment && Array.isArray(node.children)) out.push(...items(node.children as VNode[]))
    else if (node.type !== Text) out.push(node)
  }
  return out
}

/**
 * A pill that follows the pointer or keyboard focus from row to row. Each child gets its own pill
 * slot; only the active one renders the pill, and a shared `layout-id` glides it between rows.
 */
export default defineComponent({
  name: 'SharedLayoutBg',
  inheritAttrs: false,
  props: {
    /** Semantic container used for the children. */
    as: { type: String as PropType<'div' | 'ul'>, default: 'div' },
    /** Class applied to the moving pill. Defaults to a subtle muted tint. */
    pillClass: { type: String, default: undefined },
    /** Horizontal inset of the pill relative to each row (px). */
    inset: { type: Number, default: 20 },
    /** Positioning override for the pill wrapper inside each item. */
    pillContainerClass: { type: String, default: undefined },
  },
  setup(props, { slots, attrs }) {
    const activeId = shallowRef<string | null>(null)
    const uid = useId()
    const reduce = useReducedMotion()
    // Focus leaving the list only clears the pill when the pointer is not still resting on an item.
    let hovering = false

    function onLeave(event: MouseEvent) {
      hovering = false
      // Keep the pill on a focused item so keyboard position stays visible.
      if (!(event.currentTarget as HTMLElement).contains(document.activeElement)) activeId.value = null
    }
    function onBlur(event: FocusEvent) {
      const next = event.relatedTarget
      if (!hovering && !(next instanceof Node && (event.currentTarget as HTMLElement).contains(next))) activeId.value = null
    }

    return () => {
      const children = items(slots.default?.() ?? []).map((child, index) => {
        const key = child.key != null ? String(child.key) : `item-${index}`
        const hidden = reduce.value
        const pill = h(AnimatePresence, { custom: activeId.value !== null }, () => activeId.value !== null
          ? h(motion.div, {
            key: 'pill',
            initial: hidden ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)' },
            animate: hidden ? { opacity: 1 } : { opacity: 1, filter: 'blur(0px)' },
            exit: hidden ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)' },
            class: ['be-shared-bg-container', props.pillContainerClass],
            style: { left: `${-props.inset}px`, right: `${-props.inset}px` },
          }, () => activeId.value === key
            ? h(motion.div, {
              layoutId: `shared-bg-${uid}`,
              transition: hidden ? { duration: 0 } : layoutSpring,
              class: ['be-shared-bg-pill', props.pillClass],
            })
            : null)
          : null)
        const body = h('div', { class: 'be-shared-bg-body' }, child.children as never)
        const handlers = {
          class: 'be-shared-bg-item',
          onMouseenter: () => { hovering = true; activeId.value = key },
          // Focus bubbles as focusin, so a link or button anywhere inside the item brings the pill to it.
          onFocusin: () => { activeId.value = key },
        }
        if (typeof child.type === 'string') {
          const element = h(child.type, mergeProps(child.props ?? {}, handlers), [pill, body])
          // Keep the parent's scope id so its scoped styles still reach the row.
          const internals = element as unknown as { scopeId: unknown; slotScopeIds: unknown }
          internals.scopeId = child.scopeId
          internals.slotScopeIds = (child as unknown as { slotScopeIds: unknown }).slotScopeIds
          element.key = key
          return element
        }
        // A component row cannot take extra children, so it sits in a wrapper that owns the pill.
        return h('div', { key, ...handlers }, [pill, h('div', { class: 'be-shared-bg-body' }, [child])])
      })
      return h(props.as, mergeProps(attrs, {
        class: 'be-shared-bg',
        onMouseleave: onLeave,
        onFocusout: onBlur,
      }), children)
    }
  },
})
</script>

<style>
.be-shared-bg { display: flex; width: 100%; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.be-shared-bg-item { position: relative; }
.be-shared-bg-body { position: relative; z-index: 10; }
.be-shared-bg-container { pointer-events: none; position: absolute; top: 0; bottom: 0; }
.be-shared-bg-pill { pointer-events: none; width: 100%; height: 100%; border-radius: 1rem; background: color-mix(in srgb, var(--beui-muted) 80%, transparent); }
</style>
