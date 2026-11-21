<script setup lang="ts">
import { computed, provide, useId } from 'vue'
import { dockKey } from './dock-context'
import DockItem from './DockItem.vue'
import DockSeparator from './DockSeparator.vue'

interface Item { id: string; label: string; icon?: string; separatorBefore?: boolean; href?: string }
const { items, size = 44, label = 'Dock' } = defineProps<{
  /** Optional data-driven items. Omit to compose `DockItem` and `DockSeparator` in the default slot. */
  items?: readonly Item[]
  /** Size of each item in px. */
  size?: number
  /** Accessible name when the dock is data-driven. */
  label?: string
}>()
const selected = defineModel<string>()
const pillLayoutId = `${useId()}-pill`
provide(dockKey, computed(() => ({ size, pillLayoutId })))
</script>

<template>
  <nav v-if="items" class="be-dock" :aria-label="label">
    <template v-for="item in items" :key="item.id">
      <DockSeparator v-if="item.separatorBefore" />
      <DockItem v-if="!item.href" :aria-label="item.label" :active="selected === item.id" @click="selected = item.id">
        <slot name="icon" :item="item"><span aria-hidden="true">{{ item.icon ?? item.label[0] }}</span></slot>
      </DockItem>
      <DockItem v-else :active="selected === item.id">
        <a :href="item.href" :aria-label="item.label" :aria-current="selected === item.id ? 'page' : undefined" class="be-dock-link" @click="selected = item.id">
          <slot name="icon" :item="item"><span aria-hidden="true">{{ item.icon ?? item.label[0] }}</span></slot>
        </a>
      </DockItem>
    </template>
  </nav>
  <div v-else class="be-dock"><slot /></div>
</template>

<style scoped>
.be-dock { display: inline-flex; height: auto; align-items: flex-end; gap: .375rem; padding: .25rem .5rem; box-sizing: border-box; border: 1px solid var(--beui-border); border-radius: 1rem; background: color-mix(in srgb, var(--beui-card) 80%, transparent); box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
.be-dock-link { display: grid; place-items: center; width: 100%; height: 100%; border-radius: 9999px; color: inherit; text-decoration: none; outline: none; }
.be-dock-link:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
</style>
