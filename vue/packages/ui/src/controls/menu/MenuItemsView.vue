<script setup lang="ts">
import { computed } from 'vue'
import DropdownMenuCheckboxItem from './DropdownMenuCheckboxItem.vue'
import DropdownMenuItem from './DropdownMenuItem.vue'
import DropdownMenuLabel from './DropdownMenuLabel.vue'
import DropdownMenuRadioGroup from './DropdownMenuRadioGroup.vue'
import DropdownMenuRadioItem from './DropdownMenuRadioItem.vue'
import DropdownMenuSeparator from './DropdownMenuSeparator.vue'
import DropdownMenuShortcut from './DropdownMenuShortcut.vue'
import DropdownMenuSub from './DropdownMenuSub.vue'
import DropdownMenuSubContent from './DropdownMenuSubContent.vue'
import DropdownMenuSubTrigger from './DropdownMenuSubTrigger.vue'
import type { MenuItemSpec } from './menu-types'

// Renders the data-driven `items` API through the same parts the compound API
// uses, so both look and behave identically.
const props = defineProps<{ items: readonly MenuItemSpec[] }>()
const emit = defineEmits<{ select: [item: MenuItemSpec] }>()

type Block = { kind: 'item'; item: MenuItemSpec; inset?: boolean } | { kind: 'radios'; items: MenuItemSpec[] }
const blocks = computed<Block[]>(() => {
  const out: Block[] = []
  props.items.forEach((item, index) => {
    if (item.type === 'radio') {
      const last = out[out.length - 1]
      if (last?.kind === 'radios') last.items.push(item)
      else out.push({ kind: 'radios', items: [item] })
      return
    }
    const next = props.items[index + 1]
    out.push({ kind: 'item', item, inset: item.type === 'label' && (next?.type === 'checkbox' || next?.type === 'radio') })
  })
  return out
})
function checkedValue(items: MenuItemSpec[]) { return items.find(item => item.checked)?.value ?? '' }
</script>

<template>
  <template v-for="(block, index) in blocks" :key="block.kind === 'item' ? block.item.value : `radios-${index}`">
    <DropdownMenuRadioGroup v-if="block.kind === 'radios'" :value="checkedValue(block.items)">
      <DropdownMenuRadioItem v-for="item in block.items" :key="item.value" :value="item.value" :disabled="item.disabled" :text-value="item.textValue ?? item.label"
        :close-on-select="item.closeOnSelect ?? false" @select="emit('select', item)">{{ item.label }}</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
    <DropdownMenuSeparator v-else-if="block.item.type === 'separator'" />
    <DropdownMenuLabel v-else-if="block.item.type === 'label'" :inset="block.inset">{{ block.item.label }}</DropdownMenuLabel>
    <DropdownMenuCheckboxItem v-else-if="block.item.type === 'checkbox'" :checked="Boolean(block.item.checked)" :disabled="block.item.disabled"
      :text-value="block.item.textValue ?? block.item.label" :close-on-select="block.item.closeOnSelect ?? false" @check-change="emit('select', block.item)">{{ block.item.label }}</DropdownMenuCheckboxItem>
    <DropdownMenuSub v-else-if="block.item.children?.length">
      <DropdownMenuSubTrigger :disabled="block.item.disabled" :text-value="block.item.textValue ?? block.item.label">
        <component :is="block.item.icon" v-if="block.item.icon" aria-hidden="true" />{{ block.item.label }}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent><MenuItemsView :items="block.item.children" @select="emit('select', $event)" /></DropdownMenuSubContent>
    </DropdownMenuSub>
    <DropdownMenuItem v-else :disabled="block.item.disabled" :tone="block.item.destructive ? 'destructive' : 'default'" :close-on-select="block.item.closeOnSelect !== false"
      :text-value="block.item.textValue ?? block.item.label" @select="emit('select', block.item)">
      <component :is="block.item.icon" v-if="block.item.icon" aria-hidden="true" />{{ block.item.label }}
      <DropdownMenuShortcut v-if="block.item.shortcut">{{ block.item.shortcut }}</DropdownMenuShortcut>
    </DropdownMenuItem>
  </template>
</template>
