<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { pressSpring } from '../core/motion'

/** The month and year choice grid (port of `CalendarChoices`). */
const props = defineProps<{
  id: string
  label: string
  choices: { id: string; label: string; disabled: boolean }[]
  selected: string
  focusOnMount: boolean
  reduce: boolean
}>()
const emit = defineEmits<{ close: []; select: [id: string] }>()

const root = useTemplateRef<HTMLFieldSetElement>('root')
const cursor = shallowRef<string | null>(props.selected)
const enabled = computed(() => props.choices.filter(choice => !choice.disabled))
// Resolved during render so exactly one choice is a tab stop in the first commit.
const active = computed(() => enabled.value.find(choice => choice.id === cursor.value)?.id ?? enabled.value.find(choice => choice.id === props.selected)?.id ?? enabled.value[0]?.id)
watch(active, next => { if (cursor.value !== null && cursor.value !== next) cursor.value = next ?? null }, { flush: 'sync' })

onMounted(async () => {
  if (!props.focusOnMount) return
  await nextTick()
  root.value?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus({ preventScroll: true })
})

function onKey(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  const buttons = Array.from(root.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
  const index = buttons.indexOf(event.currentTarget as HTMLButtonElement)
  const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }
  const offset = offsets[event.key] ?? null
  let target: number | null = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : offset === null ? null : index + offset
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
    return
  }
  if (target === null) return
  event.preventDefault()
  const step = offset === null ? (event.key === 'Home' ? 1 : -1) : Math.sign(offset)
  while (target >= 0 && target < buttons.length && buttons[target]!.disabled) target += step
  buttons[target]?.focus({ preventScroll: true })
}
</script>

<template>
  <fieldset :id="id" ref="root" :aria-label="label" class="drp-choices">
    <motion.button
      v-for="choice in choices"
      :key="choice.id"
      type="button"
      class="drp-choice"
      :class="{ 'drp-choice-selected': choice.id === selected }"
      :disabled="choice.disabled"
      :aria-pressed="choice.id === selected"
      :tabindex="choice.id === active ? 0 : -1"
      :while-press="reduce ? undefined : { scale: 0.96 }"
      :transition="pressSpring"
      @focus="cursor = choice.id"
      @keydown="onKey"
      @click="emit('select', choice.id)"
    >
      {{ choice.label }}
    </motion.button>
  </fieldset>
</template>

<style scoped>
.drp-choices { display: grid; min-height: 15.25rem; grid-template-columns: repeat(3, minmax(0, 1fr)); align-content: start; gap: 0.5rem; margin: 0; min-width: 0; border: 0; padding: 0.25rem 0 0; }
.drp-choice {
  display: flex; box-sizing: border-box; height: 3.25rem; align-items: center; justify-content: center; margin: 0; padding: 0 0.25rem; border: 0; border-radius: 0.75rem;
  background: color-mix(in srgb, var(--beui-muted) 40%, transparent); color: inherit; font: inherit; font-size: 13px; line-height: 1.25rem; font-variant-numeric: tabular-nums; cursor: pointer; outline: none;
  transition: color 150ms, background-color 150ms, box-shadow 150ms;
}
@media (hover: hover) { .drp-choice:hover:not(:disabled, .drp-choice-selected) { background: var(--beui-muted); } }
.drp-choice-selected { background: var(--beui-foreground); color: var(--beui-background); font-weight: 500; }
.drp-choice:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.drp-choice:disabled { opacity: 0.25; cursor: default; }
</style>
