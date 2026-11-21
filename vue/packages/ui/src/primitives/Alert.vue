<script setup lang="ts">
import { AnimatePresence } from 'motion-v'
import { computed, nextTick, onBeforeUnmount, provide, shallowRef, useId, watch } from 'vue'
import AlertSurface from './AlertSurface.vue'
import { alertKey, alertMessages, useOpenState, type AlertMessages, type AlertVariant } from './state'

const props = withDefaults(defineProps<{
  variant?: AlertVariant
  open?: boolean
  defaultOpen?: boolean
  role?: 'alert' | 'status'
  returnFocusRef?: HTMLElement | null
  contentClassName?: string
  labels?: Partial<AlertMessages>
}>(), { open: undefined, defaultOpen: true, variant: 'default' })
const emit = defineEmits<{ 'update:open': [value: boolean]; openChange: [value: boolean] }>()

// False from the commit that starts the exit onward: interaction, focus order
// and the accessibility tree release with the exit start, while the visual
// fade keeps playing (upstream `PresenceGate`).
const isPresent = shallowRef(true)
// A component ref can be cleared while `AnimatePresence` keeps the frame, so the
// exiting node is found by its own id instead.
const surfaceId = useId().replace(/[^\w-]/g, '')
function surfaceNode() {
  return document.querySelector<HTMLElement>(`[data-alert-id="${surfaceId}"]`)
}
function setOpenWithGate(next: boolean) {
  if (next === open.value) return
  if (!next) handOffFocus()
  isPresent.value = next
  setOpen(next)
}
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, value => {
  if (!value) handOffFocus()
  emit('update:open', value)
  emit('openChange', value)
})
// A click on the close button is what usually hides the alert, so focus is on
// its way out of the tree — hand it back before the surface goes inert.
function handOffFocus() {
  const surface = surfaceNode()
  const active = surface?.ownerDocument.activeElement
  if (!surface?.contains(active ?? null)) return
  const target = props.returnFocusRef
  target?.focus({ preventScroll: true })
  // The element to return to is often disabled while the alert is open (a
  // "Show alert" button) and only re-enables once the parent re-renders, so a
  // focus() now is a no-op. React runs this in a layout effect after that
  // commit; here, retry once the pending render has flushed.
  if (target && target.ownerDocument.activeElement !== target) {
    void nextTick(() => {
      const current = target.ownerDocument.activeElement
      if (current === target || (current && current !== target.ownerDocument.body && !surface.contains(current))) return
      target.focus({ preventScroll: true })
    })
  }
}
const dismiss = () => setOpenWithGate(false)
const variant = computed(() => props.variant)
provide(alertKey, {
  open,
  variant,
  isPresent,
  surfaceId,
  setOpen,
  dismiss,
  dismissLabel: computed(() => props.labels?.dismiss ?? alertMessages.dismiss),
})
// AnimatePresence keeps a leaving vnode's last render, so a gate read from a
// binding there stays stale. Patch the retained node directly on the commit
// that starts the exit — interaction, focus order and the accessibility tree
// release at once while the fade finishes (the same approach as Breadcrumb).
watch(open, value => {
  if (value) {
    isPresent.value = true
    return
  }
  isPresent.value = false
  const node = surfaceNode()
  if (!node) return
  node.setAttribute('inert', '')
  node.setAttribute('aria-hidden', 'true')
  node.setAttribute('data-state', 'closed')
  node.style.pointerEvents = 'none'
}, { flush: 'post' })

onBeforeUnmount(() => {
  isPresent.value = false
})
</script>

<template>
  <AnimatePresence :initial="false">
    <AlertSurface v-if="open" :content-class-name="contentClassName">
      <slot :open="open" :variant="variant" :dismiss="dismiss" :set-open="setOpen" />
    </AlertSurface>
  </AnimatePresence>
</template>

<style>
.be-alert {
  position: relative; box-sizing: border-box; width: 100%; padding: 1rem; border-radius: .75rem;
  color: var(--beui-foreground); background: var(--beui-background); font-size: .875rem;
  transition: color .2s, background-color .2s;
}
.be-alert[data-variant=info] { --be-alert-color: var(--beui-primary); }
.be-alert[data-variant=success] { --be-alert-color: #047857; }
.be-alert[data-variant=warning] { --be-alert-color: #92400e; }
.be-alert[data-variant=destructive] { --be-alert-color: var(--beui-destructive); }
:is(.dark,[data-beui-theme=dark]) .be-alert[data-variant=success] { --be-alert-color: #34d399; }
:is(.dark,[data-beui-theme=dark]) .be-alert[data-variant=warning] { --be-alert-color: #fcd34d; }
.be-alert:not([data-variant=default]) { color: var(--be-alert-color); background: color-mix(in srgb, var(--be-alert-color) 5%, transparent); }
.be-alert-row { display: flex; min-width: 0; align-items: flex-start; gap: .75rem; }
.be-alert-content { flex: 1; min-width: 0; }
.be-alert-content > * + * { margin-top: .25rem; }
.be-alert-title { font-weight: 500; line-height: 1.25rem; text-wrap: pretty; }
.be-alert-description { color: var(--beui-muted-foreground); line-height: 1.625; text-wrap: pretty; }
.be-alert-description a { text-decoration: underline; text-underline-offset: .25rem; }
.be-alert-action { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; padding-top: .5rem; }
</style>
