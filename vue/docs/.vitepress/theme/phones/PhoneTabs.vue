<script setup lang="ts">
import { Tabs } from 'beui-vue'
import { shallowRef, toRef } from 'vue'
import { useLocale } from '../i18n'
import { useLoop } from './use-loop'

const props = defineProps<{ playing: boolean }>()
const { t } = useLocale()

const pill = shallowRef('overview')
const overflow = shallowRef('overview')
const segment = shallowRef('day')
const icon = shallowRef('feed')
const underline = shallowRef('all')

const pillItems = [{ value: 'overview', label: 'Overview' }, { value: 'activity', label: 'Activity' }, { value: 'settings', label: 'Settings' }]
const summaries: Record<string, string> = { overview: 'High-level summary.', activity: 'Recent events.', settings: 'Preferences.' }
const overflowItems = ['Overview', 'Activity', 'Analytics', 'Members', 'Billing', 'Settings'].map(label => ({ value: label.toLowerCase(), label }))
const segmentItems = [{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]
const iconItems = [{ value: 'feed', label: 'Feed' }, { value: 'events', label: 'Events' }, { value: 'profile', label: 'Profile' }]
const underlineItems = [{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]

// A finger working down the screen, as in the upstream Tabs clip.
useLoop(toRef(props, 'playing'), [
  { at: 1000, run: () => { pill.value = 'activity' } },
  { at: 2100, run: () => { pill.value = 'settings' } },
  { at: 3200, run: () => { overflow.value = 'analytics' } },
  { at: 4300, run: () => { overflow.value = 'members' } },
  { at: 5400, run: () => { segment.value = 'week' } },
  { at: 6300, run: () => { icon.value = 'events' } },
  { at: 7200, run: () => { underline.value = 'open' } },
  { at: 8300, run: () => { pill.value = 'overview' } },
  { at: 8900, run: () => { overflow.value = 'overview'; segment.value = 'day'; icon.value = 'feed'; underline.value = 'all' } },
], 9800)
</script>

<template>
  <p class="ph-lead">{{ t('Pill, segment and underline with a gliding indicator.') }}</p>
  <section class="ph-section">
    <p class="ph-h">Pill</p>
    <p class="ph-note">{{ t('The default. Labels change color where the pill passes.') }}</p>
    <div class="ph-demo"><Tabs v-model="pill" :items="pillItems" /></div>
    <p class="ph-after">{{ t(summaries[pill]!) }}</p>
  </section>
  <section class="ph-section">
    <p class="ph-h">Overflow</p>
    <p class="ph-note">{{ t('Wider lists scroll and reveal the selected tab.') }}</p>
    <div class="ph-demo"><Tabs v-model="overflow" :items="overflowItems" /></div>
  </section>
  <section class="ph-section">
    <p class="ph-h">Segment</p>
    <div class="ph-demo"><Tabs v-model="segment" :items="segmentItems" variant="segment" /></div>
  </section>
  <section class="ph-section">
    <p class="ph-h">{{ t('Icon on selected') }}</p>
    <p class="ph-note">{{ t('Only the selected tab carries its icon. It springs open beside the label as the pill arrives.') }}</p>
    <div class="ph-demo">
      <Tabs v-model="icon" :items="iconItems" icons="selected">
        <template #icon="{ item }">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path v-if="item.value === 'feed'" d="M10.27 21a2 2 0 0 0 3.46 0M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33" />
            <path v-else-if="item.value === 'events'" d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path v-else d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          </svg>
        </template>
      </Tabs>
    </div>
  </section>
  <section class="ph-section">
    <p class="ph-h">Underline</p>
    <div class="ph-demo"><Tabs v-model="underline" :items="underlineItems" variant="underline" /></div>
  </section>
</template>
