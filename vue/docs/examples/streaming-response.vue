<script setup lang="ts">
import { StreamingResponse } from 'beui-vue'
import { onBeforeUnmount, ref } from 'vue'
const answer = 'The release adds keyboard navigation, typed events, and source citations.'
const text = ref(answer)
const status = ref<'streaming' | 'complete'>('complete')
const sources = [{ id:'guide', title:'Vue accessibility guide', domain:'vuejs.org', url:'https://vuejs.org/guide/best-practices/accessibility.html' }]
let timer: ReturnType<typeof setInterval> | undefined
function stream() {
  clearInterval(timer)
  status.value = 'streaming'
  text.value = ''
  timer = setInterval(() => {
    text.value = answer.slice(0, text.value.length + 4)
    if (text.value === answer) { clearInterval(timer); status.value = 'complete' }
  }, 65)
}
onBeforeUnmount(() => clearInterval(timer))
</script>
<template><StreamingResponse :status="status" :copy-text="answer" :sources="sources" @retry="stream">{{ text }}</StreamingResponse></template>
