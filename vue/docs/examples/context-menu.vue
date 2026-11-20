<script setup lang="ts">
import { ContextMenu, type MenuItem } from 'beui-vue'
import { computed, ref } from 'vue'
const offline = ref(false)
const message = ref('or long-press · Shift + F10')
const items = computed<MenuItem[]>(() => [
  { value: 'header', label: 'Project files', type: 'label' },
  { value: 'open', label: 'Open', shortcut: '↵' }, { value: 'rename', label: 'Rename', shortcut: 'R' },
  { value: 'duplicate', label: 'Duplicate', shortcut: '⌘D' }, { value: 'download', label: 'Download' },
  { value: 'line', label: '', type: 'separator' },
  { value: 'offline', label: 'Keep offline', type: 'checkbox', checked: offline.value, closeOnSelect: false },
  { value: 'trash', label: 'Move to trash', destructive: true, shortcut: '⌘⌫' },
])
function select(item: MenuItem) {
  if (item.value === 'offline') { offline.value = !offline.value; message.value = offline.value ? 'Available offline' : 'Online only' }
  else message.value = `${item.label} selected`
}
</script>
<template><ContextMenu label="Folder actions" :items="items" @select="select"><span class="folder" aria-hidden="true"></span><strong>Right click on me</strong><small>{{ message }}</small></ContextMenu></template>
<style scoped>.folder { position: relative; display: block; margin: 1rem auto; width: 8rem; height: 5rem; border-radius: .7rem; background: linear-gradient(#dfae52 22%,#efc86f 22%); box-shadow: 0 .5rem 1rem -.75rem #614307; } .folder::before { content: ''; position: absolute; top: -.5rem; left: .25rem; width: 3.5rem; height: .65rem; border-radius: .5rem .5rem 0 0; background: #dfae52; } strong,small { display: block; } small { margin-top: .25rem; color: var(--beui-muted-foreground); }</style>
