<script setup lang="ts">
import CrashGame from './CrashGame.vue'
import type { CrashProps } from './crash-round'

const props = withDefaults(defineProps<CrashProps>(), { sound: undefined })
const emit = defineEmits<{
  start: [round: number]
  cashOut: [multiplier: number]
  crash: [point: number, payout: number | null]
  'update:autoCashOut': [value: number | null]
  autoCashOutChange: [value: number | null]
  'update:sound': [value: boolean]
  soundChange: [value: boolean]
}>()
</script>

<template>
  <CrashGame v-bind="props" design="balloon" @start="emit('start', $event)" @cash-out="emit('cashOut', $event)"
    @crash="(point, payout) => emit('crash', point, payout)" @update:auto-cash-out="emit('update:autoCashOut', $event)" @auto-cash-out-change="emit('autoCashOutChange', $event)"
    @update:sound="emit('update:sound', $event)" @sound-change="emit('soundChange', $event)" />
</template>
