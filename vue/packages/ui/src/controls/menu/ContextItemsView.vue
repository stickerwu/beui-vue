<script setup lang="ts">
import { computed } from 'vue'
import ContextMenuCheckboxItem from './ContextMenuCheckboxItem.vue'
import ContextMenuItem from './ContextMenuItem.vue'
import ContextMenuLabel from './ContextMenuLabel.vue'
import ContextMenuRadioGroup from './ContextMenuRadioGroup.vue'
import ContextMenuRadioItem from './ContextMenuRadioItem.vue'
import ContextMenuShortcut from './ContextMenuShortcut.vue'
import DropdownMenuSeparator from './DropdownMenuSeparator.vue'
import type { MenuItemSpec } from './menu-types'

// The data-driven `items` form of ContextMenu, built from the same parts.
const props = defineProps<{ items: readonly MenuItemSpec[] }>()
const emit = defineEmits<{ select: [item: MenuItemSpec] }>()

type Block = { kind: 'item'; item: MenuItemSpec } | { kind: 'radios'; items: MenuItemSpec[] }
const blocks = computed<Block[]>(() => {
  const out: Block[] = []
  for (const item of props.items) {
    if (item.type === 'radio') {
      const last = out[out.length - 1]
      if (last?.kind === 'radios') last.items.push(item)
      else out.push({ kind: 'radios', items: [item] })
    } else out.push({ kind: 'item', item })
  }
  return out
})
</script>

<template>
  <template v-for="(block, index) in blocks" :key="block.kind === 'item' ? block.item.value : `radios-${index}`">
    <ContextMenuRadioGroup v-if="block.kind === 'radios'" :value="block.items.find(item => item.checked)?.value ?? ''">
      <ContextMenuRadioItem v-for="item in block.items" :key="item.value" :value="item.value" :disabled="item.disabled" :text-value="item.textValue ?? item.label"
        :close-on-select="item.closeOnSelect !== false" @select="emit('select', item)">{{ item.label }}</ContextMenuRadioItem>
    </ContextMenuRadioGroup>
    <DropdownMenuSeparator v-else-if="block.item.type === 'separator'" />
    <ContextMenuLabel v-else-if="block.item.type === 'label'">{{ block.item.label }}</ContextMenuLabel>
    <ContextMenuCheckboxItem v-else-if="block.item.type === 'checkbox'" :checked="Boolean(block.item.checked)" :disabled="block.item.disabled"
      :text-value="block.item.textValue ?? block.item.label" :close-on-select="block.item.closeOnSelect !== false" @checked-change="emit('select', block.item)">{{ block.item.label }}</ContextMenuCheckboxItem>
    <ContextMenuItem v-else :disabled="block.item.disabled" :tone="block.item.destructive ? 'destructive' : 'default'" :close-on-select="block.item.closeOnSelect !== false"
      :text-value="block.item.textValue ?? block.item.label" @select="emit('select', block.item)">
      <component :is="block.item.icon" v-if="block.item.icon" aria-hidden="true" />{{ block.item.label }}
      <ContextMenuShortcut v-if="block.item.shortcut">{{ block.item.shortcut }}</ContextMenuShortcut>
    </ContextMenuItem>
  </template>
</template>
