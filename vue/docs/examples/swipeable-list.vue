<script setup lang="ts">
import { SwipeableList, type SwipeableListItem } from 'beui-vue'
import { computed, shallowRef } from 'vue'
import { Icon, type IconName } from './blocks-b-icons'

const leftActions = [
  { id: 'done', label: 'Done', icon: 'check', tone: 'success' as const },
  { id: 'pin', label: 'Pin', icon: 'pin', tone: 'primary' as const },
]
const rightActions = [
  { id: 'later', label: 'Later', icon: 'clock', tone: 'warning' as const },
  { id: 'trash', label: 'Trash', icon: 'trash', tone: 'danger' as const },
]
const row = (id: string, title: string, description: string, meta: string, leading: IconName): SwipeableListItem & { glyph: IconName } => ({
  id, title, description, meta, glyph: leading, leftActions, rightActions,
})
const initialItems = [
  row('brief', 'Launch brief', 'Finalize the announcement copy', '9:41', 'fileText'),
  row('feedback', 'Client feedback', 'Three comments need a response', '11:08', 'mail'),
  row('review', 'Design review', 'Check spacing before handoff', '13:20', 'user'),
  row('incident', 'Flagged run', 'Retry queue has one failed job', 'Now', 'flag'),
]
const items = shallowRef(initialItems)
const lastAction = shallowRef('Ready')
const glyphs = computed(() => Object.fromEntries(items.value.map(item => [item.id, (item as typeof initialItems[number]).glyph])))

function reset() {
  items.value = initialItems
  lastAction.value = 'Queue restored'
}
function onAction({ item, action }: { item: SwipeableListItem, action: { id: string, label: string } }) {
  lastAction.value = `${action.label} · ${item.title}`
  if (action.id === 'trash') items.value = items.value.filter(entry => entry.id !== item.id)
}
</script>

<template>
  <div class="swipe-demo">
    <div class="swipe-demo-panel">
      <div class="swipe-demo-head">
        <div>
          <p class="swipe-demo-title">Priority queue</p>
          <p class="swipe-demo-sub">{{ lastAction }}</p>
        </div>
        <button type="button" class="swipe-demo-reset" @click="reset"><Icon name="rotateCcw" :size="14" />Reset</button>
      </div>

      <SwipeableList :items="items" @action="onAction">
        <template #leading="{ item }"><div class="swipe-demo-leading"><Icon :name="glyphs[item.id]" /></div></template>
        <template #icon="{ action }"><Icon :name="action.icon as IconName" /></template>
      </SwipeableList>

      <div class="swipe-demo-foot"><span>{{ items.length }} open</span><span>Today</span></div>
    </div>
  </div>
</template>

<style scoped>
.swipe-demo { display: flex; box-sizing: border-box; min-height: 24rem; width: 100%; align-items: center; justify-content: center; }
.swipe-demo-panel { box-sizing: border-box; width: 100%; max-width: 24rem; padding: .75rem; border: 1px solid var(--beui-border); border-radius: 2rem; background: var(--beui-background); box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25); }
.swipe-demo-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; margin-bottom: .75rem; padding-inline: .25rem; }
.swipe-demo-head p { margin: 0; }
.swipe-demo-title { font-size: .875rem; line-height: 1.25rem; font-weight: 600; color: var(--beui-foreground); }
.swipe-demo-sub { font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.swipe-demo-reset { display: inline-flex; align-items: center; gap: .375rem; height: 2rem; padding: 0 .75rem; border: 1px solid var(--beui-border); border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; font-weight: 500; cursor: pointer; transition: color .15s; }
.swipe-demo-reset:hover { color: var(--beui-foreground); }
.swipe-demo-leading { display: grid; width: 2.5rem; height: 2.5rem; place-items: center; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); color: var(--beui-muted-foreground); }
.swipe-demo-foot { display: flex; align-items: center; justify-content: space-between; margin-top: .75rem; padding-inline: .25rem; font-size: 11px; font-weight: 500; color: var(--beui-muted-foreground); }
</style>
