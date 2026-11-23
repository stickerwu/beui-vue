<script setup lang="ts">
import { Alert, AlertClose, AlertContent, AlertDescription, AlertIcon, AlertTitle, ButtonBase, Tabs } from 'beui-vue'
import { computed, shallowRef, toRef } from 'vue'
import { useLocale } from '../i18n'
import { useLoop } from './use-loop'

const props = defineProps<{ playing: boolean }>()
const { t } = useLocale()

type Variant = 'info' | 'success' | 'warning' | 'destructive'
const messages: Record<Variant, { label: string; title: string; description: string }> = {
  info: { label: 'Info', title: 'A little heads up', description: 'Your changes are saved automatically as you work.' },
  success: { label: 'Success', title: 'All set', description: 'Your changes have been saved.' },
  warning: { label: 'Warning', title: 'Almost at the limit', description: "You're getting close to your storage limit. Free up some space before uploading more files." },
  destructive: { label: 'Error', title: 'Something went wrong', description: "We couldn't save your changes. Give it another try." },
}
const items = (Object.keys(messages) as Variant[]).map(value => ({ value, label: messages[value].label }))
const variant = shallowRef<Variant>('info')
const open = shallowRef(true)
const message = computed(() => messages[variant.value])

const stack = [
  { id: 'update', variant: 'info' as const, title: 'Update available', description: 'Version 2.4 is ready to install.' },
  { id: 'backup', variant: 'success' as const, title: 'Backup complete', description: 'All 1,284 photos are safe.' },
  { id: 'card', variant: 'warning' as const, title: 'Card expires soon', description: 'Update your payment method before May.' },
]
const stacked = shallowRef<Record<string, boolean>>({ update: true, backup: true, card: true })
const scrolled = shallowRef(false)
const dismiss = (id: string) => { stacked.value = { ...stacked.value, [id]: false } }

useLoop(toRef(props, 'playing'), [
  { at: 1100, run: () => { variant.value = 'success' } },
  { at: 2200, run: () => { variant.value = 'warning' } },
  { at: 3300, run: () => { variant.value = 'destructive' } },
  { at: 4400, run: () => { variant.value = 'info' } },
  { at: 5500, run: () => { open.value = false } },
  { at: 6600, run: () => { open.value = true } },
  { at: 7600, run: () => { scrolled.value = true } },
  { at: 8800, run: () => dismiss('update') },
  { at: 9900, run: () => dismiss('backup') },
  { at: 11200, run: () => { scrolled.value = false } },
  { at: 12000, run: () => { stacked.value = { update: true, backup: true, card: true } } },
], 12800)
</script>

<template>
  <div class="ph-scroll" :class="{ 'is-scrolled': scrolled }">
    <p class="ph-lead">{{ t('Feedback that eases in and folds away.') }}</p>
    <section class="ph-section">
      <p class="ph-h">Variants</p>
      <p class="ph-note">{{ t('Switching blends the color, swaps the icon and springs the height. Dismissing folds it away.') }}</p>
      <div class="ph-demo ph-alert-demo">
        <Tabs v-model="variant" :items="items" variant="segment" />
        <Alert v-model:open="open" :variant="variant">
          <AlertIcon />
          <AlertContent><AlertTitle>{{ message.title }}</AlertTitle><AlertDescription>{{ message.description }}</AlertDescription></AlertContent>
          <AlertClose />
        </Alert>
        <ButtonBase variant="ghost" size="sm" :disabled="open" class="ph-show">Show alert</ButtonBase>
      </div>
    </section>
    <section class="ph-section">
      <p class="ph-h">Stacked</p>
      <p class="ph-note">{{ t('Content below glides up into the space a dismissed alert leaves.') }}</p>
      <div class="ph-demo ph-stack">
        <Alert v-for="alert in stack" :key="alert.id" :open="stacked[alert.id]" :variant="alert.variant">
          <AlertIcon />
          <AlertContent><AlertTitle>{{ alert.title }}</AlertTitle><AlertDescription>{{ alert.description }}</AlertDescription></AlertContent>
          <AlertClose />
        </Alert>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ph-scroll { transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1); }
.ph-scroll.is-scrolled { transform: translateY(-300px); }
.ph-alert-demo { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.ph-alert-demo > :first-child { align-self: flex-start; }
.ph-alert-demo :deep(.be-alert), .ph-stack :deep(.be-alert) { width: 100%; }
.ph-show { color: var(--muted-foreground); }
.ph-stack { display: flex; flex-direction: column; gap: 14px; }
@media (prefers-reduced-motion: reduce) { .ph-scroll { transition: none; } }
</style>
