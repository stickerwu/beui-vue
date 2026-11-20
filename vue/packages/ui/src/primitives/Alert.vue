<script setup lang="ts">
import { computed, nextTick, provide, shallowRef, watch } from 'vue'
import { alertKey, alertMessages, useOpenState, type AlertVariant, type AlertMessages } from './state'

const props = withDefaults(defineProps<{
  variant?: AlertVariant, open?: boolean, defaultOpen?: boolean, role?: 'alert' | 'status',
  returnFocusRef?: HTMLElement | null, contentClassName?: string, labels?: Partial<AlertMessages>
}>(), { open: undefined, defaultOpen: true, variant: 'default' })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const surface = shallowRef<HTMLElement | null>(null)
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, value => {
  emit('update:open', value)
  emit('openChange', value)
})
const dismiss = () => setOpen(false)
const variant = computed(() => props.variant)
const role = computed(() => props.role ?? (['destructive', 'warning'].includes(props.variant) ? 'alert' : 'status'))
provide(alertKey, { open, variant, setOpen, dismiss, dismissLabel: computed(() => props.labels?.dismiss ?? alertMessages.dismiss) })
watch(open, async visible => {
  if (visible || !surface.value?.contains(surface.value.ownerDocument.activeElement)) return
  await nextTick()
  props.returnFocusRef?.focus({ preventScroll: true })
})
function leave(element: Element) {
  element.setAttribute('inert', '')
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('data-state', 'closed')
}
</script>

<template>
  <Transition name="be-alert" @before-leave="leave">
    <div v-if="open" ref="surface" class="be-alert" :role="role" data-slot="alert" data-state="open" :data-variant="variant">
      <div class="be-alert-row" :class="contentClassName"><slot :open="open" :variant="variant" :dismiss="dismiss" :set-open="setOpen" /></div>
    </div>
  </Transition>
</template>

<style>
.be-alert { position: relative; box-sizing: border-box; width: 100%; padding: 1rem; border-radius: .75rem; color: var(--beui-foreground); background: var(--beui-background); font-size: .875rem; }
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
.be-alert-enter-active, .be-alert-leave-active { transition: opacity .18s, transform .2s; transition-timing-function: cubic-bezier(.16,1,.3,1); }
.be-alert-leave-active { transition-duration: .12s; pointer-events: none; }
.be-alert-enter-from, .be-alert-leave-to { opacity: 0; transform: translateY(-6px); }
@media (prefers-reduced-motion: reduce) { .be-alert-enter-from, .be-alert-leave-to { transform: none; } }
</style>
