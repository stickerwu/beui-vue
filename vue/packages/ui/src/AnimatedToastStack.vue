<script setup lang="ts">
import { AnimatePresence } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch, type VNodeChild } from 'vue'
import ToastItem from './core/ToastItem.vue'
import { animatedToastStackMessages, type AnimatedToast, type ToastClassNames, type ToastPosition, type ToastStatus } from './core/toasts'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  toasts: readonly AnimatedToast[]
  onDismiss?: (id: string) => void
  position?: ToastPosition
  placement?: 'static' | 'fixed' | 'absolute'
  fixed?: boolean
  portal?: boolean
  /** A selector or an element; defaults to `document.body`. */
  portalRoot?: string | Element | null
  maxVisible?: number
  className?: string
  classNames?: ToastClassNames
  /** Replace the glyph shown for a status. */
  icons?: Partial<Record<ToastStatus, VNodeChild>>
  /** Override any built-in string. */
  labels?: Partial<typeof animatedToastStackMessages>
}>(), {
  position: 'bottom-right',
  placement: undefined,
  fixed: false,
  portal: undefined,
  portalRoot: undefined,
  maxVisible: 4,
  labels: undefined,
})

defineSlots<{
  /** Replace a toast's whole inner content (the React `renderToast`). */
  toast?(props: { toast: AnimatedToast }): unknown
  /** Alias of `toast`, named after the React `renderToast` prop. */
  renderToast?(props: { toast: AnimatedToast }): unknown
  /** Replace the status glyph inside the built-in layout. */
  icon?(props: { toast: AnimatedToast; status: ToastStatus }): unknown
}>()

const text = computed(() => ({ ...animatedToastStackMessages, ...props.labels }))

const location = computed(() => props.placement ?? (props.fixed ? 'fixed' : 'static'))
const usePortal = computed(() => props.portal ?? location.value === 'fixed')
const isBottom = computed(() => props.position.startsWith('bottom'))
const visible = computed(() => props.toasts.slice(-props.maxVisible))

/**
 * The React original resolves its portal target in an effect, so a portalled
 * stack renders nothing on the server and nothing until the DOM exists. Same
 * rule here: `null` means "not resolved yet", which suppresses the output.
 */
const portalTarget = shallowRef<Element | null>(null)

function resolvePortalTarget() {
  if (typeof document === 'undefined') return
  if (!usePortal.value) {
    portalTarget.value = null
    return
  }
  const root = props.portalRoot
  portalTarget.value = typeof root === 'string'
    ? document.querySelector(root) ?? document.body
    : root ?? document.body
}

onMounted(resolvePortalTarget)
watch([() => props.portalRoot, usePortal], resolvePortalTarget)
onBeforeUnmount(() => { portalTarget.value = null })
</script>

<template>
  <Teleport v-if="!usePortal || portalTarget" :to="portalTarget ?? 'body'" :disabled="!usePortal">
    <ol
      v-bind="$attrs"
      class="be-toasts"
      :class="[classNames?.root, className]"
      :data-position="position"
      :data-placement="location"
      :data-edge="isBottom ? 'bottom' : 'top'"
      :aria-label="text.list"
      aria-live="polite"
      aria-atomic="false">
      <AnimatePresence :initial="false" mode="popLayout">
        <ToastItem
          v-for="(item, index) in visible"
          :key="item.id"
          :toast="item"
          :index="index"
          :dismiss="onDismiss"
          :class-names="classNames"
          :icons="icons"
          :dismiss-label="text.dismiss">
          <template v-if="$slots.toast || $slots.renderToast" #default="scope"><slot v-if="$slots.toast" name="toast" v-bind="scope" /><slot v-else name="renderToast" v-bind="scope" /></template>
          <template v-if="$slots.icon" #icon="scope"><slot name="icon" v-bind="scope" /></template>
        </ToastItem>
      </AnimatePresence>
    </ol>
  </Teleport>
</template>

<style scoped>
.be-toasts {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: .5rem;
  width: calc(100vw - 2rem);
  max-width: 24rem;
  padding: 0;
  margin: 0;
  list-style: none;
  pointer-events: none;
}
.be-toasts[data-edge=bottom] { flex-direction: column-reverse; }
.be-toasts[data-placement=fixed] { position: fixed; z-index: 90; }
.be-toasts[data-placement=absolute] { position: absolute; z-index: 20; }
/* The offsets only apply once the stack leaves the flow; a static stack sits
   wherever its parent put it. */
.be-toasts:not([data-placement=static])[data-position^=top] { top: max(1rem, env(safe-area-inset-top)); }
.be-toasts:not([data-placement=static])[data-position^=bottom] { bottom: max(1.5rem, env(safe-area-inset-bottom)); }
.be-toasts:not([data-placement=static])[data-position$=left] { left: max(1rem, env(safe-area-inset-left)); }
.be-toasts:not([data-placement=static])[data-position$=center] { left: 50%; transform: translateX(-50%); }
.be-toasts:not([data-placement=static])[data-position$=right] { right: max(1rem, env(safe-area-inset-right)); }
</style>
