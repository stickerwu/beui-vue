<script setup lang="ts">
import { SR_ONLY } from './plot-utils'
import VolumeProfilePlot from './VolumeProfilePlot.vue'
import VolumeProfileSummary from './VolumeProfileSummary.vue'
import VolumeProfileTooltip from './VolumeProfileTooltip.vue'
import { provideVolumeProfile, useVolumeProfileModel, type VolumeProfileEmit, type VolumeProfileProps } from './volume-profile-context'

defineSlots<{
  /** Compose `VolumeProfilePlot`, `VolumeProfileTooltip` and `VolumeProfileSummary`; omit it for the complete chart. */
  default?(): unknown
}>()
// Without an explicit default, Vue would cast an absent `number | false` prop to `false`.
const props = withDefaults(defineProps<VolumeProfileProps>(), { valueArea: 0.7 })
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()
const model = useVolumeProfileModel(props, emit as VolumeProfileEmit)
provideVolumeProfile(model)
const { t, label, unit, rows, formatPrice, formatVolume, model: profile } = model
const levelOf = (item: (typeof rows.value)[number]) => item.isPoc ? t('poc') : item.inValueArea ? t('inside') : profile.value.valueArea ? t('outside') : '—'
</script>

<template>
  <section class="profile" data-slot="volume-profile" :aria-label="label">
    <slot>
      <VolumeProfilePlot />
      <VolumeProfileTooltip />
      <VolumeProfileSummary />
    </slot>
    <div :style="SR_ONLY"><table><caption>{{ t('caption', { label }) }}</caption>
      <thead><tr><th scope="col">{{ t('priceRange') }}</th><th scope="col">{{ t('volume', { unit }) }}</th><th scope="col">{{ t('share') }}</th><th scope="col">{{ t('level') }}</th></tr></thead>
      <tbody><tr v-for="item in rows" :key="item.id"><th scope="row">{{ t('range', { low: formatPrice(item.priceLow), high: formatPrice(item.priceHigh) }) }}</th><td>{{ formatVolume(item.volume) }}</td><td>{{ (item.share * 100).toFixed(1) }}%</td><td>{{ levelOf(item) }}</td></tr></tbody></table></div>
  </section>
</template>

<style scoped>
.profile { display: flex; flex-direction: column; gap: 20px; width: 100%; min-width: 0; }
</style>
