<script setup lang="ts">
import { Alert, AlertAction, AlertClose, AlertContent, AlertDescription, AlertIcon, AlertTitle, ButtonBase, Tabs } from 'beui-vue'
import { computed, shallowRef } from 'vue'

const messages = {
  info: { label: 'Info', title: 'A little heads up', description: 'Your changes are saved automatically as you work.' },
  success: { label: 'Success', title: 'All set', description: 'Your changes have been saved.' },
  warning: { label: 'Warning', title: 'Almost at the limit', description: "You're getting close to your storage limit. Free up some space before uploading more files." },
  destructive: { label: 'Error', title: 'Something went wrong', description: "We couldn't save your changes. Give it another try." },
}
const items = Object.entries(messages).map(([value, { label }]) => ({ value, label }))
const variant = shallowRef<keyof typeof messages>('info')
const open = shallowRef(true)
const showButton = shallowRef<HTMLButtonElement | null>(null)
const message = computed(() => messages[variant.value])
// ButtonBase renders its own <button>; the alert needs that element to hand focus back to.
function captureShow(instance: unknown) {
  showButton.value = (instance as { $el?: HTMLButtonElement } | null)?.$el ?? null
}
function select(value: string) {
  variant.value = value as keyof typeof messages
  open.value = true
}
</script>

<template>
  <div class="alert-demo">
    <Tabs class="tabs" :model-value="variant" :items="items" :labels="{ list: 'Alert variant' }" @update:model-value="select" />
    <Alert v-model:open="open" :variant="variant" :return-focus-ref="showButton">
      <AlertIcon /><AlertContent>
        <AlertTitle>{{ message.title }}</AlertTitle><AlertDescription>{{ message.description }}</AlertDescription>
        <AlertAction v-if="variant === 'destructive'"><ButtonBase size="sm" variant="outline" @click="select('success')">Try again</ButtonBase></AlertAction>
      </AlertContent><AlertClose />
    </Alert>
    <ButtonBase :ref="captureShow" variant="ghost" size="sm" :disabled="open" @click="open = true">Show alert</ButtonBase>
  </div>
</template>

<style scoped>
.alert-demo { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; width: 100%; max-width: 28rem; }
.tabs { width: 100%; }
.alert-demo :deep(.be-trigger) { padding: 6px 12px; font-size: .75rem; line-height: 1rem; }
</style>
