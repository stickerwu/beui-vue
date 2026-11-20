<script setup lang="ts">
import { ref } from 'vue'
import { Timeline } from 'beui-vue'
const active = ref('signups')
const events = [
  ['beta','2025-06-12','Private beta opens','1,248'], ['android','2025-08-03','Now on Android','3,106'],
  ['offline','2025-10-14','Offline drafts','4,827'], ['signups','2025-11-20','Weekly signups double','6,175'],
  ['spaces','2026-01-09','Shared spaces','2,640'], ['command','2026-03-17','The command menu','5,302'],
  ['rank','2026-05-28','Top 10 in productivity','13,916'], ['two','2026-08-05','Lumen 2.0','27,130'],
].map(([id,date,title,likes]) => ({ id:id!, date:date!, title:title!, meta:`♡ ${likes}` }))
</script>
<template><Timeline v-model="active" :events="events" label="Lumen release history"><template #media="{ event }">
  <div class="media"><svg v-if="['beta','signups','rank'].includes(event.id)" viewBox="0 0 100 50" preserveAspectRatio="none" aria-label="Rising line chart" role="img"><path d="M0 42 L10 39 L18 41 L27 34 L36 37 L45 29 L54 31 L63 19 L72 23 L82 10 L91 13 L100 3" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
    <span v-else-if="event.id==='command'">⌘　K</span><span v-else-if="event.id==='two'">2.0</span><div v-else class="tiles"><i v-for="tile in event.id==='spaces'?6:2" :key="tile"/></div></div>
</template></Timeline></template>
<style scoped>.media { display:grid; place-items:center; height:6.5rem; background:var(--beui-muted); font:600 2rem system-ui; } svg,.tiles { width:100%; height:100%; } .tiles { box-sizing:border-box; padding:.5rem; display:grid; grid-template-columns:repeat(3,1fr); gap:.4rem; } .tiles i { background:var(--beui-card); border:1px solid var(--beui-border); border-radius:.4rem; }</style>
