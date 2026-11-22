<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, inject } from 'vue'
import { layoutSpring } from '../core/motion'
import { DRP_KEY, parse } from './drp-core'

/** Opens the calendar. Its label is the chosen range; its icons come with it. */
const props = defineProps<{
  /** Text when no range is chosen. */
  placeholder?: string
  disabled?: boolean
}>()
defineSlots<{
  /** Replaces the icons and the range summary. */
  default?: () => unknown
}>()
const ctx = inject(DRP_KEY)
if (!ctx) throw new Error('DateRangePickerTrigger must be used within DateRangePicker')

const summary = computed(() => {
  const value = ctx.value.value
  if (!value) return props.placeholder ?? ctx.t('placeholder')
  const sameYear = value.to && value.from.slice(0, 4) === value.to.slice(0, 4)
  const start = (sameYear ? ctx.formats.value.shortNoYear : ctx.formats.value.short).format(parse(value.from))
  return `${start} – ${value.to ? ctx.formats.value.short.format(parse(value.to)) : ctx.t('selectEnd')}`
})
function setTrigger(node: unknown) {
  ctx!.trigger.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node) as HTMLElement | null
}
</script>

<template>
  <motion.button
    :id="ctx.triggerId"
    :ref="setTrigger"
    type="button"
    class="drp-trigger"
    :layout="!ctx.reduce.value"
    :transition="{ layout: layoutSpring }"
    :style="{ borderRadius: '12px' }"
    :disabled="disabled || ctx.disabled.value"
    :aria-label="ctx.t('triggerLabel', { label: ctx.label.value, summary })"
    aria-haspopup="dialog"
    :aria-expanded="ctx.open.value"
    :aria-controls="ctx.open.value ? ctx.contentId : undefined"
    @click="ctx.setOpen(!ctx.open.value)"
  >
    <motion.span v-if="$slots.default" :layout="ctx.reduce.value ? false : 'position'" :transition="{ layout: layoutSpring }" class="drp-trigger-custom"><slot /></motion.span>
    <template v-else>
      <motion.span :layout="ctx.reduce.value ? false : 'position'" :transition="{ layout: layoutSpring }" class="drp-trigger-icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>
      </motion.span>
      <motion.span :layout="ctx.reduce.value ? false : 'position'" :transition="{ layout: layoutSpring }" class="drp-trigger-text">{{ summary }}</motion.span>
      <motion.span :layout="ctx.reduce.value ? false : 'position'" :transition="{ layout: layoutSpring }" class="drp-trigger-icon" aria-hidden="true">
        <svg class="drp-trigger-chevron" :class="{ 'drp-flip': ctx.open.value }" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </motion.span>
    </template>
  </motion.button>
</template>

<style>
.drp-trigger {
  display: inline-flex; box-sizing: border-box; width: fit-content; max-width: 100%; height: 2.25rem; align-items: center; gap: 0.5rem; margin: 0; padding: 0 0.75rem;
  border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-size: 13px; line-height: 1.25rem; font-weight: 500; cursor: pointer; outline: none;
  transition: color 150ms, background-color 150ms, box-shadow 150ms;
}
@media (hover: hover) { .drp-trigger:hover:not(:disabled) { background: color-mix(in srgb, var(--beui-muted) 40%, transparent); } }
.drp-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.drp-trigger:disabled { opacity: 0.4; cursor: default; }
.drp-trigger-icon { display: inline-flex; flex-shrink: 0; color: var(--beui-muted-foreground); }
.drp-trigger-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
.drp-trigger-custom { display: inline-flex; min-width: 0; align-items: center; gap: 0.5rem; }
.drp-flip { transform: rotate(180deg); }
</style>
