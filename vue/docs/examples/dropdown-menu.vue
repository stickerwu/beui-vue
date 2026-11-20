<script setup lang="ts">
import { DropdownMenu, type MenuItem } from 'beui-vue'
import { computed, ref } from 'vue'
const status = ref(true)
const compact = ref(false)
const panel = ref('bottom')
const message = ref('')
const items = computed<MenuItem[]>(() => [
  { value: 'account', type: 'label', label: 'My account' },
  { value: 'profile', label: 'Profile', shortcut: '⇧⌘P' },
  { value: 'billing', label: 'Billing', shortcut: '⌘B' },
  { value: 'settings', label: 'Settings', shortcut: '⌘,' },
  { value: 'share', label: 'Share', children: [{ value: 'email', label: 'Email' }, { value: 'message', label: 'Message' }, { value: 'link', label: 'Copy link' }] },
  { value: 'line1', type: 'separator', label: '' },
  { value: 'view', type: 'label', label: 'View' },
  { value: 'status', label: 'Status bar', type: 'checkbox', checked: status.value, closeOnSelect: false },
  { value: 'compact', label: 'Compact rows', type: 'checkbox', checked: compact.value, closeOnSelect: false },
  { value: 'panel', type: 'label', label: 'Panel' },
  { value: 'bottom', label: 'Bottom', type: 'radio', checked: panel.value === 'bottom' },
  { value: 'right', label: 'Right', type: 'radio', checked: panel.value === 'right' },
  { value: 'hidden', label: 'Hidden', type: 'radio', disabled: true },
  { value: 'line2', type: 'separator', label: '' },
  { value: 'logout', label: 'Log out', destructive: true, shortcut: '⇧⌘Q' },
])
function select(item: MenuItem) {
  if (item.value === 'status') status.value = !status.value
  if (item.value === 'compact') compact.value = !compact.value
  if (item.type === 'radio') panel.value = item.value
  message.value = `${item.label} selected`
}
</script>
<template><div class="account-demo"><DropdownMenu :items="items" label="My account" @select="select">Options ⌄</DropdownMenu><output>{{ message }}</output></div></template>
<style scoped>.account-demo { min-height: 14rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; padding-top: 2rem; } output { color: var(--beui-muted-foreground); font-size: .75rem; }</style>
