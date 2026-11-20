<script setup lang="ts">
import { ref } from 'vue'
import { SharedLayoutBg } from 'beui-vue'
const selected = ref('')
const rows = [
  {title:'Inbox',detail:'12 unread threads, 3 mentions today.'},
  {title:'Drafts',detail:'4 posts waiting for a final pass.'},
  {title:'Releases',detail:'Last shipped 2 days ago, v0.4.1.'},
  {title:'Billing',detail:'Plan renews on the 1st of next month.'},
]
</script>
<template><SharedLayoutBg class="rows"><button v-for="row in rows" :key="row.title" type="button" :aria-pressed="selected===row.title" @click="selected=row.title"><b>{{ row.title }}</b><span>{{ row.detail }}</span></button></SharedLayoutBg></template>
<style scoped>.rows { width:min(25rem,100%); } button { display:grid; gap:.25rem; text-align:start; padding:.75rem 1rem; border:0; background:transparent; color:inherit; cursor:pointer; } span { font-size:.78rem; color:var(--beui-muted-foreground); }</style>
