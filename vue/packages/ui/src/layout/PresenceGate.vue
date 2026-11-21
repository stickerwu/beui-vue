<script lang="ts">
import { usePresence } from 'motion-v'
import { Comment, defineComponent, getCurrentInstance, shallowRef } from 'vue'

/**
 * Reads whether the subtree is leaving an `AnimatePresence` and hands it to the
 * layers. From the moment the exit starts the chrome stops taking pointer events
 * and leaves the focus order and the accessibility tree (`inert`) while the
 * visual exit keeps playing. Port of `PresenceGate`.
 *
 * `AnimatePresence` keeps a leaving subtree's last render, so the gate is also
 * patched straight onto the leaving element: a binding read from a retained
 * vnode would stay stale. `isPresent` serves the part of the subtree that is
 * still live.
 *
 * The slot should render exactly one root element: that element is the one the
 * presence removes, and the one the exit waits on. The gate renders the slot's
 * vnode itself (no wrapper, no fragment), so the `<Transition>` that
 * `AnimatePresence` uses sees an element root.
 */
export default defineComponent({
  name: 'PresenceGate',
  setup(_, { slots }) {
    const present = shallowRef(true)
    const instance = getCurrentInstance()
    // With a single-element slot `$el` is that element; with a fragment it is the
    // empty start anchor, and the element is the first one after it.
    function rootElement() {
      let node = instance?.proxy?.$el as Node | null | undefined
      while (node && node.nodeType !== 1) node = node.nextSibling
      return node as HTMLElement | null
    }
    usePresence({
      element: rootElement,
      onExit() {
        present.value = false
        const element = rootElement()
        element?.setAttribute('inert', '')
        if (element) element.style.pointerEvents = 'none'
      },
      onEnter() {
        present.value = true
        const element = rootElement()
        element?.removeAttribute('inert')
        if (element) element.style.pointerEvents = ''
      },
    })
    return () => {
      const nodes = slots.default?.({
        isPresent: present.value,
        gate: { inert: !present.value, style: { pointerEvents: present.value ? 'auto' : 'none' } },
      }) ?? []
      // Template comments (kept in dev) would turn a one-element slot into a fragment.
      const rendered = nodes.filter(node => node.type !== Comment)
      return rendered.length === 1 ? rendered[0] : nodes
    }
  },
})
</script>
