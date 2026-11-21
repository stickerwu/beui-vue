<script setup lang="ts">
import type { Labels } from './shared'
import { citationTargetId } from './shared'

const props = defineProps<{ citationId: string, index: number, idPrefix: string, label?: string, labels?: Labels }>()
function select(event: MouseEvent) {
  const target = citationTargetId(props.idPrefix, props.citationId)
  const handled = new CustomEvent('beui:citation', { detail: target, cancelable: true })
  // A matching Citations list opens itself and takes focus; without one the plain fragment link still works.
  if (!document.dispatchEvent(handled)) event.preventDefault()
}
</script>

<template>
  <a :href="`#${citationTargetId(idPrefix, citationId)}`" class="cite" :aria-label="label ?? (labels?.viewCitation ?? 'View citation {index}').replace('{index}', String(index))" @click="select">{{ index }}</a>
</template>

<style scoped>
.cite { display: inline-flex; min-width: 1rem; align-items: center; justify-content: center; margin-inline: .125rem; transform: translateY(-.125rem); border-radius: .375rem; background: color-mix(in oklab, var(--beui-muted) 60%, transparent); padding: .125rem .25rem; font-size: 10px; font-weight: 600; line-height: 1; color: var(--beui-muted-foreground); text-decoration: none; outline: none; transition: color .15s; }
.cite:hover { color: var(--beui-foreground); }
.cite:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>
