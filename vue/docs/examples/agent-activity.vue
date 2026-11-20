<script setup lang="ts">
import { AgentActivity, type ActivityItem } from 'beui-vue'
import { ref } from 'vue'
const status = ref<'working' | 'complete'>('working')
const items: ActivityItem[] = [
  { id:'plan', type:'step', status:'complete', label:'Review the request' },
  { id:'search', type:'search', query:'Vue accessibility', results:[{id:'guide',title:'Accessibility guide',domain:'vuejs.org',url:'https://vuejs.org/guide/best-practices/accessibility.html'}] },
  { id:'read', type:'tool', action:'Read', target:'src/App.vue' },
  { id:'note', type:'text', content:'The component already provides a visible focus ring.' },
  { id:'write', type:'trace', kind:'write', label:'Drafting the implementation notes' },
]
</script>
<template><div class="be-agent-demo"><AgentActivity :items="items" :status="status" :duration="12" /><button type="button" class="be-agent-button" @click="status = status === 'working' ? 'complete' : 'working'">{{ status === 'working' ? 'Complete run' : 'Replay' }}</button></div></template>
