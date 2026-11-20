<script setup lang="ts">
import { computed } from 'vue'
import { useValue } from '../agents/shared'
const props = withDefaults(defineProps<{
  title: string
  category?: string
  volume: string
  volumeHistory?: number[]
  status?: string
  live?: boolean
  outcomes: { id:string, label:string, probability:number, color?:string }[]
  bookmarked?: boolean
  defaultBookmarked?: boolean
  labels?: Record<string,string>
}>(), { bookmarked:undefined, defaultBookmarked:false })
const emit = defineEmits<{
  'update:bookmarked':[value:boolean]
  bookmarkChange:[value:boolean]
  outcomeClick:[selection:{outcomeId:string,side:'yes'|'no'}]
}>()
const {value: saved,set} = useValue(() => props.bookmarked, props.defaultBookmarked, value => {
  emit('update:bookmarked',value)
  emit('bookmarkChange',value)
})
const points = computed(() => {
  const data = props.volumeHistory?.filter(Number.isFinite) ?? []
  const low = Math.min(...data)
  const range = Math.max(...data) - low || 1
  return data.map((value,index) => `${index * 80 / Math.max(1,data.length - 1)},${19 - (value - low) / range * 17}`).join(' ')
})
function percent(probability:number) {
  return Math.round(Math.max(0,Math.min(1,probability || 0)) * 100)
}
</script>

<template>
  <article class="be-block be-block-panel be-block-stack">
    <header class="be-block-row"><slot name="icon" /><div><small>{{ category }}</small><div><strong>{{ title }}</strong></div></div><button type="button" class="be-block-button be-block-end" :aria-label="(labels?.bookmark ?? 'Bookmark {title}').replace('{title}',title)" :aria-pressed="saved" @click="set(!saved)">☆</button></header>
    <div v-for="outcome in outcomes" :key="outcome.id" class="outcome">
      <div class="be-block-row"><slot name="outcome-icon" :outcome="outcome" /><strong>{{ outcome.label }}</strong><span class="be-block-end">{{ percent(outcome.probability) }}%</span></div>
      <div class="bar"><i :style="{width:`${percent(outcome.probability)}%`, background:outcome.color}" /></div>
      <div class="be-block-row">
        <button v-for="side in (['yes','no'] as const)" :key="side" type="button" class="be-block-button" :aria-label="`${side} · ${outcome.label}`" @click="emit('outcomeClick',{outcomeId:outcome.id,side})">{{ labels?.[side] ?? (side === 'yes' ? 'Yes' : 'No') }} {{ side === 'yes' ? percent(outcome.probability) : 100-percent(outcome.probability) }}¢</button>
      </div>
    </div>
    <footer class="be-block-row be-block-muted"><span>{{ live ? '● ' : '' }}{{ status }}</span><span class="be-block-end">{{ volume }} vol.</span><svg v-if="points" viewBox="0 0 80 20" width="80" height="20" aria-hidden="true"><polyline :points="points" fill="none" stroke="currentColor" stroke-width="1.5" /></svg></footer>
  </article>
</template>

<style scoped>
.outcome { display:grid; gap:.45rem; }
.bar { height:3px; border-radius:2px; background:var(--beui-muted); overflow:hidden; }
.bar i { display:block; height:100%; background:var(--beui-foreground); }
</style>
