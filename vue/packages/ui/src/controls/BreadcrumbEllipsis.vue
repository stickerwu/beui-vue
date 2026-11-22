<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, shallowRef, watch } from 'vue'
import { useMountedMedia } from '../core/mounted-media'
import PopoverMorph from './popover/PopoverMorph.vue'
import { breadcrumbMessages, breadcrumbOverflowKey, useBreadcrumbMessages } from './breadcrumb-context'

/** Hover disclosure with click and touch toggle, and keyboard access to the hidden ancestor links. Put the hidden `BreadcrumbItem`s inside, in path order. */
const props = defineProps<{
  /** Accessible name of the disclosure button. */
  label?: string
}>()
defineSlots<{
  /** The hidden `BreadcrumbItem`s. */
  default?: () => unknown
}>()

const messages = useBreadcrumbMessages()
const t = computed(() => messages?.value ?? breadcrumbMessages)
provide(breadcrumbOverflowKey, true)

const open = shallowRef(false)
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
const trigger = shallowRef<HTMLButtonElement | null>(null)
const overflow = shallowRef<HTMLOListElement | null>(null)
// The refs sit inside slots, so a template ref would resolve to an array; hold the node itself.
function bindTrigger(element: Element | { $el?: unknown } | null) {
  trigger.value = element instanceof HTMLButtonElement ? element : null
}
function bindOverflow(element: Element | { $el?: unknown } | null) {
  overflow.value = element instanceof HTMLOListElement ? element : null
}
let closeTimer: number | undefined
let focusOnOpen = false
const placement = reactive<{ align: 'start' | 'end'; side: 'top' | 'bottom'; width: number }>({ align: 'start', side: 'bottom', width: 224 })
function measurePlacement() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const right = window.innerWidth - rect.left - 8
  const left = rect.right - 8
  const align = right < 224 && left > right ? 'end' : 'start'
  const below = window.innerHeight - rect.bottom
  placement.align = align
  placement.side = below < 280 && rect.top > below ? 'top' : 'bottom'
  placement.width = Math.max(32, Math.min(224, align === 'start' ? right : left))
}
function cancelClose() {
  if (closeTimer !== undefined) window.clearTimeout(closeTimer)
  closeTimer = undefined
}
function leave() {
  cancelClose()
  // Allow the pointer to cross the gap between the trigger and the panel.
  closeTimer = window.setTimeout(() => {
    const active = document.activeElement
    if (!overflow.value?.contains(active) && active !== trigger.value) open.value = false
  }, 160)
}
function enter(event: PointerEvent) {
  cancelClose()
  if (canHover.value && event.pointerType === 'mouse') {
    focusOnOpen = false
    open.value = true
  }
}
function firstPath() {
  overflow.value?.querySelector<HTMLElement>('a[href],button')?.focus({ preventScroll: true })
}
// Enter and Space open through PopoverMorph, which moves focus to the first path itself; ArrowDown opens here.
function triggerKeys(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown') return
  event.preventDefault()
  focusOnOpen = true
  open.value = true
}
watch(open, async next => {
  if (!next) return
  measurePlacement()
  await nextTick()
  if (!focusOnOpen) return
  // The panel becomes visible after its parent's layout measurement.
  let frames = 0
  const focus = () => {
    firstPath()
    if (overflow.value?.contains(document.activeElement) || ++frames > 6) { focusOnOpen = false; return }
    requestAnimationFrame(focus)
  }
  focus()
})
function panelClick(event: MouseEvent) {
  if ((event.target as Element | null)?.closest('a[href]')) open.value = false
}
function focusOutside(event: FocusEvent) {
  if (!open.value) return
  const target = event.target as Node | null
  if (!target || target === trigger.value || overflow.value?.contains(target)) return
  open.value = false
}
onMounted(() => { document.addEventListener('focusin', focusOutside); window.addEventListener('resize', measurePlacement) })
onBeforeUnmount(() => {
  cancelClose()
  document.removeEventListener('focusin', focusOutside)
  window.removeEventListener('resize', measurePlacement)
})
</script>

<template>
  <PopoverMorph v-model:open="open" as-child :side="placement.side" :align="placement.align" :side-offset="6" :radius="10" content-class="be-crumb-panel">
    <template #trigger>
      <button :ref="bindTrigger" type="button" class="be-crumb-ellipsis" :aria-label="label ?? t.showHidden"
        @pointerenter="enter" @pointerleave="leave" @keydown="triggerKeys">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></svg>
      </button>
    </template>
    <ol :ref="bindOverflow" class="be-crumb-overflow" :style="{ width: `${placement.width - 14}px` }"
      @pointerenter="cancelClose" @pointerleave="leave" @click="panelClick">
      <slot />
    </ol>
  </PopoverMorph>
</template>

<style>
.be-crumb-ellipsis { display: inline-flex; box-sizing: border-box; width: 2rem; height: 2rem; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: .375rem; background: none; color: var(--beui-muted-foreground); cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-crumb-ellipsis:hover { background: color-mix(in oklab, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-crumb-ellipsis:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-crumb-ellipsis svg { width: 1rem; height: 1rem; }
.be-crumb-panel { padding: .375rem; }
.be-crumb-overflow { box-sizing: content-box; display: flex; flex-direction: column; gap: .125rem; max-height: 16rem; overflow-y: auto; margin: 0; padding: 0; list-style: none; }
.be-crumb-hidden { width: 100%; }
.be-crumb-hidden > [data-breadcrumb-separator] { display: none; }
.be-crumb-hidden :is(a, button) { box-sizing: border-box; display: flex; width: 100%; align-items: center; padding: .25rem .5rem; border: 0; border-radius: .375rem; background: none; color: var(--beui-muted-foreground); font: inherit; font-weight: 500; text-align: start; text-decoration: none; cursor: pointer; overflow-wrap: anywhere; }
.be-crumb-hidden :is(a, button):hover { background: color-mix(in oklab, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-crumb-hidden :is(a, button):focus-visible { outline: 2px solid var(--beui-ring); outline-offset: -2px; }
</style>
