<script lang="ts">
import { cloneVNode, defineComponent, Comment, Fragment, Text, type VNode } from 'vue'
import { useCenterMorphModal } from './center-morph-context'

/** Wraps one interactive element and closes the modal. */
export default defineComponent({
  name: 'CenterMorphModalClose',
  setup(_, { slots }) {
    const context = useCenterMorphModal('CenterMorphModalClose')
    return () => {
      const nodes = (slots.default?.() ?? []).flatMap(node => (node.type === Fragment ? (node.children as VNode[]) : [node]))
      const child = nodes.find(node => node.type !== Comment && node.type !== Text)
      if (!child) return nodes
      return cloneVNode(child, { onClick: (event: MouseEvent) => { if (!event.defaultPrevented) context.setOpen(false) } }, true)
    }
  },
})
</script>
