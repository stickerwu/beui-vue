<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref } from 'vue'
import { ExpandableActionBar } from 'beui-vue'
import { DemoIcon, type DemoIconName } from './action-bar-icons'

const ACTIONS: { id: string; label: string; icon: DemoIconName; shortcut?: string; badge?: string }[] = [
  { id: 'send', label: 'Send', icon: 'Send', shortcut: 'S' },
  { id: 'copy', label: 'Copy', icon: 'Copy', shortcut: 'C' },
  { id: 'download', label: 'Export', icon: 'Download', shortcut: 'E' },
  { id: 'archive', label: 'Archive', icon: 'Archive' },
  { id: 'alerts', label: 'Alerts', icon: 'Bell', badge: '3' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
]

const expanded = ref(false)
const activeId = ref('send')
const items = computed(() => ACTIONS.map(({ id, label, shortcut, badge }) => ({ id, label, shortcut, badge, active: id === activeId.value })))
const iconOf = new Map(ACTIONS.map(action => [action.id, action.icon]))
const SPRING = { type: 'spring', bounce: 0, duration: 0.3 } as const
</script>

<template>
  <div class="bar-stage">
    <div class="bar-row">
      <ExpandableActionBar v-model:expanded="expanded" :items="items" :active-id="activeId" :class-names="{ item: 'bar-item' }" @action="activeId = $event.id">
        <template #icon="{ item }"><DemoIcon :name="iconOf.get(item.id)!" :class="`bar-icon bar-icon-${item.id}`" /></template>
      </ExpandableActionBar>
    </div>

    <div class="bar-controls">
      <motion.button type="button" class="toggle" :while-hover="{ scale: 1.02 }" :while-press="{ scale: 0.96 }" @click="expanded = !expanded">
        <motion.div layout class="toggle-inner">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toggle-icon">
            <motion.path :initial="false" :animate="{ d: expanded ? 'M 10 20 L 10 14 L 4 14' : 'M 9 21 L 3 21 L 3 15' }" :transition="SPRING" />
            <motion.path :initial="false" :animate="{ d: expanded ? 'M 14 4 L 14 10 L 20 10' : 'M 15 3 L 21 3 L 21 9' }" :transition="SPRING" />
            <line x1="14" x2="21" y1="10" y2="3" />
            <line x1="3" x2="10" y1="21" y2="14" />
          </svg>
          <AnimatePresence mode="popLayout" :initial="false">
            <motion.span :key="expanded ? 'expanded' : 'collapsed'" :initial="{ opacity: 0, y: -25, filter: 'blur(4px)' }"
              :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }" :exit="{ opacity: 0, y: 25, filter: 'blur(4px)' }" :transition="SPRING">
              {{ expanded ? 'Collapse' : 'Expand' }}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </motion.button>
    </div>
  </div>
</template>

<style scoped>
.bar-stage { display: flex; min-height: 18rem; width: 100%; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; }
.bar-row { display: flex; min-height: 6rem; width: 100%; align-items: center; justify-content: center; }
.bar-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem; }
.toggle { position: relative; display: flex; box-sizing: border-box; width: 110px; height: 2.25rem; align-items: center; justify-content: center; overflow: hidden; margin: 0; padding: 0; border: 1px solid var(--beui-border); border-radius: 9999px; background: var(--beui-card); color: var(--beui-foreground); font: inherit; font-size: .75rem; line-height: 1rem; font-weight: 500; cursor: pointer; transition: border-color .15s; }
.toggle:hover { border-color: var(--border-strong, color-mix(in srgb, var(--beui-foreground) 16%, transparent)); }
.toggle-inner { display: flex; align-items: center; gap: .375rem; }
.toggle-icon { width: .875rem; height: .875rem; flex: none; }
.bar-icon { width: 1rem; height: 1rem; }
.bar-icon-alerts { transform-origin: top; }
@media (prefers-reduced-motion: no-preference) {
  :deep(.bar-item:hover) .bar-icon-send { animation: action-send 520ms var(--ease-out, cubic-bezier(.16, 1, .3, 1)) both; }
  :deep(.bar-item:hover) .bar-icon-copy { animation: action-copy 520ms var(--ease-out, cubic-bezier(.16, 1, .3, 1)) both; }
  :deep(.bar-item:hover) .bar-icon-download { animation: action-download 540ms var(--ease-out, cubic-bezier(.16, 1, .3, 1)) both; }
  :deep(.bar-item:hover) .bar-icon-archive { animation: action-archive 520ms var(--ease-out, cubic-bezier(.16, 1, .3, 1)) both; }
  :deep(.bar-item:hover) .bar-icon-alerts { animation: action-bell 680ms var(--ease-out, cubic-bezier(.16, 1, .3, 1)) both; }
  :deep(.bar-item:hover) .bar-icon-settings { animation: action-settings 720ms var(--ease-out, cubic-bezier(.16, 1, .3, 1)) both; }
}
@keyframes action-send { 0%, 100% { transform: translate(0, 0); } 45% { transform: translate(2px, -2px); } }
@keyframes action-copy { 0%, 100% { transform: translate(0, 0); } 40% { transform: translate(1.5px, -1.5px); } 70% { transform: translate(-1px, 1px); } }
@keyframes action-download { 0%, 100% { transform: translateY(0); } 42% { transform: translateY(2.5px); } }
@keyframes action-archive { 0%, 100% { transform: scale(1); } 45% { transform: scale(.9); } }
@keyframes action-bell { 0%, 100% { transform: rotate(0deg); } 18% { transform: rotate(14deg); } 36% { transform: rotate(-12deg); } 54% { transform: rotate(8deg); } 72% { transform: rotate(-5deg); } }
@keyframes action-settings { 0% { transform: rotate(0deg); } 100% { transform: rotate(90deg); } }
</style>
