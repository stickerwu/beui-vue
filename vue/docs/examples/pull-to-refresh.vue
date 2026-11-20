<script setup lang="ts">
import { ref } from 'vue'
import { PullToRefresh } from 'beui-vue'
const entries = ref(['Design notes','Release checklist','New references'])
let revision = 0
async function refresh() {
  await new Promise(resolve => setTimeout(resolve,600))
  entries.value.unshift(`New update ${++revision}`)
}
</script>
<template><div class="feed"><strong>Activity feed</strong><p>Pull down to refresh.</p><PullToRefresh :on-refresh="refresh"><ul><li v-for="entry in entries" :key="entry">{{ entry }}</li></ul></PullToRefresh></div></template>
<style scoped>.feed { width:min(24rem,100%); } p { font-size:.8rem; color:var(--beui-muted-foreground); } ul { list-style:none; padding:0; margin:0; } li { padding:.9rem; border-top:1px solid var(--beui-border); }</style>
