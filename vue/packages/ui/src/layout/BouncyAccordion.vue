<script setup lang="ts">
import { useId } from 'vue'
interface Item { id: string; title: string; description?: string; disabled?: boolean; icon?: string }
const { items } = defineProps<{ items: readonly Item[] }>()
const active = defineModel<string | null>({ default: null })
const uid = useId()
function key(event: KeyboardEvent, index: number) {
  const buttons = Array.from((event.currentTarget as HTMLElement).closest('.accordion')!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
  const current = buttons.indexOf(event.currentTarget as HTMLButtonElement)
  const indices: Record<string,number> = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: buttons.length - 1 }
  if (!(event.key in indices) || index < 0) return
  event.preventDefault(); buttons[(indices[event.key]! + buttons.length) % buttons.length]?.focus()
}
</script>
<template><div class="accordion"><div v-for="(item,index) in items" :key="item.id" class="card" :data-active="active === item.id">
  <button :id="`${uid}-button-${index}`" type="button" :aria-expanded="active === item.id" :aria-controls="`${uid}-panel-${index}`" :disabled="item.disabled" @click="active = active === item.id ? null : item.id" @keydown="key($event,index)"><span v-if="item.icon" aria-hidden="true">{{ item.icon }}</span>{{ item.title }}<i aria-hidden="true">⌄</i></button>
  <div :id="`${uid}-panel-${index}`" role="region" :aria-labelledby="`${uid}-button-${index}`" class="panel" :inert="active !== item.id" :aria-hidden="active !== item.id"><div><p><slot :item="item">{{ item.description }}</slot></p></div></div>
</div></div></template>
<style scoped>.accordion { display: grid; width: min(24rem,100%); gap: .45rem; align-content: start; } .card { border-radius: 1.05rem; background: var(--beui-card); border: 1px solid var(--beui-border); overflow: hidden; } .card button { width: 100%; display: flex; gap: .75rem; align-items: center; text-align: start; padding: .95rem 1.05rem; border: 0; color: inherit; font: inherit; font-weight: 500; background: none; cursor: pointer; } .card i { margin-inline-start: auto; font-style: normal; } .card[data-active=true] i { rotate: 180deg; } .panel { display: grid; grid-template-rows: 0fr; } .panel > div { overflow: hidden; } .card[data-active=true] .panel { grid-template-rows: 1fr; } .panel p { margin: 0; padding: 0 1.05rem 1.2rem; color: var(--beui-muted-foreground); font-size: .875rem; } @media(prefers-reduced-motion:no-preference){.panel { transition: grid-template-rows .38s cubic-bezier(.2,1.45,.45,1); } .card i { transition: rotate .24s; }}</style>
