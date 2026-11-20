<script setup lang="ts">
const { variant = 'button', label, actionLabel = 'Remove', disabled } = defineProps<{ variant?: 'button' | 'chip'; label: string; actionLabel?: string; disabled?: boolean }>()
const emit = defineEmits<{ activate: [event: MouseEvent]; remove: [event: MouseEvent] }>()
</script>
<template><button type="button" class="expander" :aria-label="variant === 'chip' ? actionLabel : label" :disabled="disabled" @click="variant === 'chip' ? emit('remove',$event) : emit('activate',$event)">
  <span v-if="variant === 'button'" class="icon" aria-hidden="true"><slot name="icon">＋</slot></span><span v-else>{{ label }}</span>
  <span class="extra"><span><template v-if="variant === 'button'">{{ label }}</template><slot v-else name="actionIcon">×</slot></span></span>
</button></template>
<style scoped>.expander { display: inline-flex; align-items: center; justify-content: center; min-height: 2.25rem; padding: .4rem .7rem; border-radius: 99px; border: 1px solid var(--beui-border); background: var(--beui-card); color: var(--beui-foreground); cursor: pointer; font: inherit; font-size: .875rem; } .extra { display: grid; grid-template-columns: 0fr; opacity: 0; } .extra > span { overflow: hidden; white-space: nowrap; } .expander:is(:hover,:focus-visible,:active) .extra { grid-template-columns: 1fr; margin-left: .45rem; opacity: 1; }
@media(hover:none){.expander .extra { grid-template-columns: 1fr; opacity: 1; margin-left: .45rem; }} @media(prefers-reduced-motion:no-preference){.extra { transition: grid-template-columns .24s, margin .24s, opacity .2s; }}</style>
