<script setup lang="ts">
import { SR_ONLY } from './plot-utils'
import StatusBarLegend from './StatusBarLegend.vue'
import StatusBarPlot from './StatusBarPlot.vue'
import StatusBarTooltip from './StatusBarTooltip.vue'
import { provideStatusBar, useStatusBarModel, type StatusBarEmit, type StatusBarProps } from './status-bar-context'

defineSlots<{
  /** Compose `StatusBarPlot`, `StatusBarTooltip` and `StatusBarLegend`; omit it for the complete chart. */
  default?(): unknown
}>()
const props = defineProps<StatusBarProps>()
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()
const model = useStatusBarModel(props, emit as StatusBarEmit)
provideStatusBar(model)
const { t, label, rows } = model
</script>

<template>
  <section class="status-bar" data-slot="status-bar" :aria-label="label">
    <slot>
      <StatusBarPlot />
      <StatusBarTooltip />
      <StatusBarLegend />
    </slot>
    <!-- Color is never the only way to read the history. The complete data stays available to screen readers without dozens of tab stops. -->
    <div :style="SR_ONLY">
      <table>
        <caption>{{ t('tableCaption', { label }) }}</caption>
        <thead><tr><th scope="col">{{ t('period') }}</th><th scope="col">{{ t('status') }}</th><th scope="col">{{ t('details') }}</th></tr></thead>
        <tbody><tr v-for="{ datum, status } in rows" :key="datum.id"><th scope="row">{{ datum.label }}</th><td>{{ status.label }}</td><td>{{ datum.description ?? '' }}</td></tr></tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.status-bar { min-width: 0; width: 100%; font-family: inherit; }
.status-bar > * + * { margin-top: 12px; }
</style>
