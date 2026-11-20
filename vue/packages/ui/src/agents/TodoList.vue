<script setup lang="ts">
import { computed } from 'vue'
import AgentDisclosure from './AgentDisclosure.vue'
import type { Labels } from './shared'
export type TodoItem = { id: string, title: string, status?: 'pending' | 'in-progress' | 'completed' | 'cancelled', progress?: number, detail?: string }
const props = withDefaults(defineProps<{ items: TodoItem[], title?: string, open?: boolean, defaultOpen?: boolean, collapseOnComplete?: boolean, maxHeight?: number, labels?: Labels }>(), { open: undefined, defaultOpen: true, collapseOnComplete: true, maxHeight: 280 })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const completed = computed(() => props.items.filter(item => item.status === 'completed').length)
const active = computed(() => props.items.some(item => !['completed', 'cancelled'].includes(item.status ?? 'pending')))
const statuses = { pending: 'Pending', 'in-progress': 'In progress', completed: 'Completed', cancelled: 'Cancelled' }
</script>
<template>
  <AgentDisclosure :open="open" :default-open="defaultOpen" :active="active" :collapse-on-complete="collapseOnComplete" :max-height="maxHeight" @update:open="emit('update:open', $event); emit('openChange', $event)">
    <template #title><span aria-hidden="true">☷</span>{{ title ?? labels?.title ?? 'To-dos' }} <span class="be-agent-chip" :aria-label="`${completed} of ${items.length} tasks completed`">{{ completed }}/{{ items.length }}</span></template>
    <ul v-if="items.length" class="be-todos" :aria-label="labels?.label ?? 'Agent task list'">
      <li v-for="item in items" :key="item.id" :data-status="item.status ?? 'pending'"><span :aria-label="statuses[item.status ?? 'pending']" role="img">{{ ({ pending:'◌', 'in-progress':'◐', completed:'✓', cancelled:'×' })[item.status ?? 'pending'] }}</span><div><slot name="item" :item="item">{{ item.title }}</slot><small v-if="item.detail">{{ item.detail }}</small><progress v-if="item.status === 'in-progress' && item.progress !== undefined" :value="item.progress" max="1" :aria-label="item.title" /></div></li>
    </ul><p v-else class="be-agent-body">{{ labels?.empty ?? 'No tasks yet' }}</p>
  </AgentDisclosure>
</template>
<style scoped>.be-todos{list-style:none;padding:.25rem 1rem .75rem;margin:0}.be-todos li{display:flex;gap:.7rem;padding:.375rem 0}.be-todos li[data-status=completed],.be-todos small{color:var(--beui-muted-foreground)}.be-todos small,.be-todos progress{display:block}.be-todos progress{height:3px;accent-color:var(--beui-primary)}</style>
