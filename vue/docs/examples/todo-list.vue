<script setup lang="ts">
import { TodoList, type TodoItem } from 'beui-vue'
import { ref } from 'vue'
const tasks = ref<TodoItem[]>([{ id:'read', title:'Read the project brief', status:'completed' }, { id:'plan', title:'Outline the implementation', status:'in-progress', progress:.6 }, { id:'verify', title:'Verify the result', status:'pending' }])
function next() {
  const unfinished = tasks.value.find(item => item.status !== 'completed')
  if (unfinished) unfinished.status = 'completed'
  const pending = tasks.value.find(item => item.status === 'pending')
  if (pending) pending.status = 'in-progress'
}
</script>
<template><div class="be-agent-demo"><TodoList :items="tasks" /><button type="button" class="be-agent-button" :disabled="tasks.every(item => item.status === 'completed')" @click="next">Complete next task</button></div></template>
