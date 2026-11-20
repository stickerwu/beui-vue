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
function select(value: string) {
  variant.value = value as keyof typeof messages
  open.value = true
}
</script>

<template>
  <div class="alert-demo">
    <Tabs :model-value="variant" :items="items" :labels="{ list: 'Alert variant' }" @update:model-value="select" />
    <Alert v-model:open="open" :variant="variant" :return-focus-ref="showButton">
      <AlertIcon /><AlertContent>
        <AlertTitle>{{ message.title }}</AlertTitle><AlertDescription>{{ message.description }}</AlertDescription>
        <AlertAction v-if="variant === 'destructive'"><ButtonBase size="sm" variant="outline" @click="select('success')">Try again</ButtonBase></AlertAction>
      </AlertContent><AlertClose />
    </Alert>
    <button ref="showButton" type="button" :disabled="open" @click="open = true">Show alert</button>
  </div>
</template>

<style scoped>
.alert-demo { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; width: 100%; max-width: 28rem; }
.alert-demo > button { padding: .4rem .75rem; border-radius: 999px; font: inherit; font-size: .75rem; cursor: pointer; }
.alert-demo > button:focus-visible { outline: 2px solid var(--beui-ring); }
.alert-demo > button:disabled { opacity: .5; cursor: default; }
</style>
