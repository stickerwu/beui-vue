<script setup lang="ts">
import { SwipeableList, type SwipeableListItem, type SwipeableListValue } from 'beui-vue'
import { shallowRef, toRef } from 'vue'
import { Icon, type IconName } from '../../../examples/blocks-b-icons'
import { useLocale } from '../i18n'
import { useLoop } from './use-loop'

const props = defineProps<{ playing: boolean }>()
const { t } = useLocale()

const leftActions = [
  { id: 'done', label: 'Done', icon: 'check', tone: 'success' as const },
  { id: 'pin', label: 'Pin', icon: 'pin', tone: 'primary' as const },
]
const rightActions = [
  { id: 'later', label: 'Later', icon: 'clock', tone: 'warning' as const },
  { id: 'trash', label: 'Trash', icon: 'trash', tone: 'danger' as const },
]
const glyph: Record<string, IconName> = { brief: 'fileText', feedback: 'mail', review: 'user', flagged: 'flag', invoice: 'fileText' }
const row = (id: string, title: string, description: string, meta: string): SwipeableListItem => ({ id, title, description, meta, leftActions, rightActions })
const items = [
  row('brief', 'Launch brief', 'Finalize the announcement copy', '9:41'),
  row('feedback', 'Client feedback', 'Three comments need a response', '11:08'),
  row('review', 'Design review', 'Check spacing before handoff', '13:20'),
  row('flagged', 'Flagged run', 'Retry queue has one failed job', 'Now'),
  row('invoice', 'Invoice #2041', 'Due Friday, $1,280', 'Fri'),
]
const value = shallowRef<SwipeableListValue | null>(null)

// The rows swipe open one after another, as a thumb would drag them.
useLoop(toRef(props, 'playing'), [
  { at: 1000, run: () => { value.value = { id: 'feedback', side: 'right' } } },
  { at: 2600, run: () => { value.value = null } },
  { at: 3300, run: () => { value.value = { id: 'review', side: 'left' } } },
  { at: 4900, run: () => { value.value = null } },
  { at: 5600, run: () => { value.value = { id: 'brief', side: 'right' } } },
  { at: 7200, run: () => { value.value = null } },
], 8200)
</script>

<template>
  <p class="ph-lead">{{ t('Rows that swipe to reveal actions.') }}</p>
  <div class="ph-queue">
    <div>
      <p class="ph-h">{{ t('Priority queue') }}</p>
      <p class="ph-note ph-small">{{ t('Swipe either way. Keep going to run the outer action.') }}</p>
    </div>
    <span class="ph-reset">{{ t('Reset') }}</span>
  </div>
  <div class="ph-demo ph-swipe">
    <SwipeableList v-model="value" :items="items">
      <template #leading="{ item }">
        <span class="ph-leading"><Icon :name="glyph[item.id]!" :size="18" /></span>
      </template>
      <template #icon="{ action }"><Icon :name="action.icon as IconName" /></template>
    </SwipeableList>
  </div>
  <p class="ph-after">{{ items.length }} open</p>
</template>

<style scoped>
.ph-queue { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-top: 34px; }
.ph-small { font-size: 13px; line-height: 17px; }
.ph-reset { flex: none; padding: 7px 14px; border: 1px solid var(--border); border-radius: 999px; background: var(--card); font-size: 14px; line-height: 18px; font-weight: 500; }
.ph-swipe :deep(.swipe-title) { font-size: 16px; font-weight: 500; }
.ph-leading { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 12px; background: var(--background); color: var(--muted-foreground); }
</style>
