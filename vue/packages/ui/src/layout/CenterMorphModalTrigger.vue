<script lang="ts">
import { cloneVNode, defineComponent, Comment, Fragment, Text, type VNode } from 'vue'
import { useCenterMorphModal } from './center-morph-context'

/** Wraps one interactive element and opens or closes the modal. */
export default defineComponent({
  name: 'CenterMorphModalTrigger',
  setup(_, { slots }) {
    const context = useCenterMorphModal('CenterMorphModalTrigger')
    return () => {
      const nodes = (slots.default?.() ?? []).flatMap(node => (node.type === Fragment ? (node.children as VNode[]) : [node]))
      const child = nodes.find(node => node.type !== Comment && node.type !== Text)
      if (!child) return nodes
      return cloneVNode(child, {
        id: context.triggerId,
        'aria-haspopup': 'dialog',
        'aria-expanded': context.open.value,
        'aria-controls': context.open.value ? context.contentId : undefined,
        onClick: (event: MouseEvent) => { if (!event.defaultPrevented) context.setOpen(!context.open.value) },
      }, true)
    }
  },
})
</script>
