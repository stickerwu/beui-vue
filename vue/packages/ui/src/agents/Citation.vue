<script setup lang="ts">
const props = defineProps<{ citationId: string, index: number, idPrefix: string, label?: string }>()
function select() { document.dispatchEvent(new CustomEvent('beui:citation', { detail: `${props.idPrefix}-${props.citationId}` })) }
</script>
<template><button type="button" class="be-cite" :aria-label="label ?? `View citation ${index}`" @click="select">{{ index }}</button></template>
<style scoped>.be-cite{display:inline-grid;place-items:center;min-width:1rem;min-height:1rem;padding:0 .2rem;vertical-align:super;border-radius:99px;background:var(--beui-muted);color:var(--beui-muted-foreground);font-size:.625rem;cursor:pointer}</style>
