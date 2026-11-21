<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useId, useTemplateRef } from 'vue'
import FloatingPanel from './FloatingPanel.vue'

/**
 * A hover/focus name tag anchored to whatever the default slot renders. Unlike
 * `Tooltip` it never wraps the content in a button, so it is safe around an
 * avatar, an image or a control that is already interactive. Timing mirrors the
 * upstream tooltip defaults (120 ms open, instant close).
 */
const props = withDefaults(defineProps<{
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  disabled?: boolean
}>(), { side: 'top', delay: 120 })

const anchor = useTemplateRef<HTMLElement>('anchor')
const id = useId()
const open = shallowRef(false)
let timer: number | undefined

function set(next: boolean, wait = 0) {
  window.clearTimeout(timer)
  const update = () => {
    if (open.value === next || (next && props.disabled)) return
    open.value = next
  }
  if (!wait) update()
  else timer = window.setTimeout(update, wait)
}
function enter(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  set(true, props.delay)
}
function focus(event: FocusEvent) {
  if ((event.currentTarget as HTMLElement).matches(':focus-visible')) set(true)
}
function clearTimer() {
  window.clearTimeout(timer)
}
onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <span ref="anchor" class="be-avatar-tip" @pointerenter="enter" @pointerleave="set(false)" @focusin="focus" @focusout="set(false)">
    <slot />
    <FloatingPanel
      :id="id"
      role="tooltip"
      :open="open && Boolean(content)"
      :anchor="anchor"
      :side="side"
      align="center"
      :gap="5"
      variant="tip"
      class="be-avatar-tip-panel"
      @dismiss="set(false)"
      @pointerenter="clearTimer"
    >{{ content }}</FloatingPanel>
  </span>
</template>

<style scoped>
.be-avatar-tip { display: inline-flex; }
.be-avatar-tip-panel {
  padding: .2rem .5rem; border: 0; border-radius: .4rem; font-size: .75rem; line-height: 1.4;
  color: var(--beui-background); background: var(--beui-foreground); white-space: nowrap;
}
</style>
