<script setup lang="ts">
import { SortableList, SortableListGroup, SortableListHandle, SortableListItem, SortableListItemContent, SortableListUndo } from 'beui-vue'
import { LucideIcon } from './layout-icons'

const tasks = [
  { id: 'research', title: 'Collect references', detail: 'Find the right direction', icon: 'FileText', tone: 'amber' },
  { id: 'design', title: 'Explore the visual system', detail: 'Type, color, and composition', icon: 'Palette', tone: 'rose' },
  { id: 'build', title: 'Build the first prototype', detail: 'Make the interaction tangible', icon: 'Layers', tone: 'blue' },
  { id: 'ship', title: 'Ship something useful', detail: 'Polish the details and release', icon: 'Rocket', tone: 'emerald' },
]
</script>

<template>
  <div class="studio">
    <div class="head">
      <div>
        <p class="eyebrow">In the studio</p>
        <h3 class="title">Make room for what matters.</h3>
      </div>
      <span class="count">04 tasks</span>
    </div>
    <SortableList :default-items="tasks" label="Studio priorities" :get-item-label="item => item.title">
      <template #default="{ items }">
        <SortableListGroup>
          <SortableListItem v-for="(item, index) in items" :id="item.id" :key="item.id">
            <SortableListHandle />
            <SortableListItemContent>
              <div class="row">
                <span class="tile" :class="`tone-${item.tone}`"><LucideIcon :name="item.icon" :size="18" /></span>
                <div class="copy">
                  <p class="name">{{ item.title }}</p>
                  <p class="detail">{{ item.detail }}</p>
                </div>
                <span class="index">{{ String(index + 1).padStart(2, '0') }}</span>
                <LucideIcon name="Circle" :size="14" class="circle" />
              </div>
            </SortableListItemContent>
          </SortableListItem>
        </SortableListGroup>
        <SortableListUndo />
      </template>
    </SortableList>
  </div>
</template>

<style scoped>
.studio { width: 100%; max-width: 28rem; }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; padding: 0 .25rem; }
.eyebrow { margin: 0 0 .25rem; font-size: 10px; font-weight: 500; letter-spacing: .18em; line-height: 1.5; text-transform: uppercase; color: var(--beui-muted-foreground); }
.title { margin: 0; padding: 0; border: 0; color: var(--beui-foreground); font-size: 1.125rem; font-weight: 500; line-height: 1.75rem; letter-spacing: -.025em; }
.count { flex: none; font-size: .75rem; line-height: 1rem; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.row { display: flex; width: 100%; align-items: center; gap: .75rem; }
.tile { display: flex; width: 2.5rem; height: 2.5rem; flex: none; align-items: center; justify-content: center; border-radius: .75rem; }
.copy { min-width: 0; flex: 1; }
.name { margin: 0; color: var(--beui-foreground); font-size: .875rem; font-weight: 500; line-height: 1.25rem; }
.detail { margin: .125rem 0 0; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.index { font-size: 10px; line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.circle { color: var(--beui-border); flex: none; }
.tone-amber { background: color-mix(in oklab, oklch(76.9% .188 70.08) 10%, transparent); color: oklch(66.6% .179 58.318); }
.tone-rose { background: color-mix(in oklab, oklch(64.5% .246 16.439) 10%, transparent); color: oklch(58.6% .253 17.585); }
.tone-blue { background: color-mix(in oklab, oklch(62.3% .214 259.815) 10%, transparent); color: oklch(54.6% .245 262.881); }
.tone-emerald { background: color-mix(in oklab, oklch(69.6% .17 162.48) 10%, transparent); color: oklch(59.6% .145 163.225); }
:global(.dark .tone-amber) { color: #fbbf24; }
:global(.dark .tone-rose) { color: #fb7185; }
:global(.dark .tone-blue) { color: #60a5fa; }
:global(.dark .tone-emerald) { color: #34d399; }
</style>
