<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'

const { min = 0, max = 10, step = 1, label = 'Quantity', disabled, name } = defineProps<{
  min?: number; max?: number; step?: number; label?: string; disabled?: boolean; name?: string
}>()
const value = defineModel<number>({ default: 0 })
const current = computed(() => Math.max(min, Math.min(Math.max(min,max), value.value)))
const minus = useTemplateRef('minus')
const plus = useTemplateRef('plus')
function change(direction: number, event: MouseEvent) {
  const stride = step > 0 ? step : 1
  const units = (current.value - min) / stride
  const unitsAfter = direction > 0 ? Math.floor(units + 1e-8) + 1 : Math.ceil(units - 1e-8) - 1
  value.value = Math.min(max, Math.max(min, Number((min + unitsAfter * stride).toFixed(8))))
  if (event.detail === 0) nextTick(() => (current.value === min ? plus.value : current.value === max ? minus.value : null)?.focus())
}
</script>
<template><fieldset class="stepper" :aria-label="label" :disabled="disabled"><input v-if="name" type="hidden" :name="name" :value="current" />
  <button v-if="current > min" ref="minus" type="button" :aria-label="`Decrease ${label}`" @click="change(-1,$event)">−</button>
  <output :aria-label="label" aria-live="polite"><Transition name="swap" mode="out-in"><span :key="current">{{ current }}</span></Transition></output>
  <button v-if="current < max" ref="plus" type="button" :aria-label="`Increase ${label}`" @click="change(1,$event)">+</button>
</fieldset></template>
<style scoped>.stepper { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border: 1px solid var(--beui-border); border-radius: 99px; background: var(--beui-card); margin: 0; padding: .25rem; }
.stepper button,.stepper output { display: grid; place-items: center; min-width: 2.5rem; height: 2.5rem; font-size: 1.2rem; }
.stepper button { border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; } .stepper button:hover { background: var(--beui-muted); } .stepper output { min-width: 3.5rem; font-variant-numeric: tabular-nums; }
@media(prefers-reduced-motion:no-preference){.swap-enter-active,.swap-leave-active { transition: transform .12s, opacity .12s; } .swap-enter-from { transform: translateY(30%); opacity: 0; } .swap-leave-to { transform: translateY(-30%); opacity: 0; }}</style>
