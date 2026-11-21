<script setup lang="ts">
import { inject } from 'vue'
import MenuItemBase from './MenuItemBase.vue'
import { subKey } from './menu-shared'

defineProps<{ disabled?: boolean; inset?: boolean; textValue?: string }>()
const sub = inject(subKey, null)
if (!sub) throw new Error('DropdownMenuSubTrigger must be used within <DropdownMenuSub>')
</script>

<template>
  <MenuItemBase :sub="sub" :disabled="disabled" :inset="inset" :text-value="textValue">
    <slot />
    <svg aria-hidden="true" class="be-menu-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
  </MenuItemBase>
</template>
