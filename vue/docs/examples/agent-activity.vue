<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AgentActivity, type ActivityItem } from 'beui-vue'
import { useAgentVariant } from '../.vitepress/use-agent-variant'
const props = defineProps<{variant?:string}>()
const {variant,choose,options} = useAgentVariant(() => props.variant,{
  'streaming-text':'agents/agent-activity-text','reasoning-steps':'agents/agent-activity-steps','web-search':'agents/agent-activity-search',
  'tool-calls':'agents/agent-activity-tools','mixed-activity':'agents/agent-activity-mixed','agent-trace':'agents/agent-trace',
})
const text = [
  'Reading the request and separating the content model from its presentation.',
  'The activity shell can stay consistent while each event supplies its own compact renderer.',
  'Text remains freeform so partial tokens can update without recreating the surrounding timeline.',
  'Once the run finishes, the viewport switches from automatic following to ordinary user-controlled scrolling.',
].join('\n')
const steps:ActivityItem[] = ['Reading the product brief','Mapping the interaction patterns','Connecting the loading and completion states','Verifying the final behavior'].map((label,index) => ({id:String(index),type:'step',label,status:'complete'}))
const tools:ActivityItem[] = [
  {id:'read',type:'tool',action:'read',target:'campaign-notes.md'},
  {id:'edit',type:'tool',action:'edit',target:'launch-plan.ts',additions:42,deletions:8},
  {id:'run',type:'tool',action:'run',target:'bun test launch'},
]
const searches:ActivityItem[] = [
  {id:'docs',type:'search',query:'Vue documentation accessibility',results:[{id:'vue',title:'Vue documentation',domain:'vuejs.org',url:'https://vuejs.org/guide/best-practices/accessibility.html'}]},
  {id:'web',type:'search',query:'Web accessibility patterns',results:[{id:'google',title:'Google for Developers',domain:'developers.google.com'},{id:'github',title:'GitHub',domain:'github.com'},{id:'vercel',title:'Vercel Docs',domain:'vercel.com'}]},
]
const trace:ActivityItem[] = [
  {id:'plan',type:'trace',kind:'thinking',label:'Thinking',detail:'Mapping the interaction flow…'},
  {id:'decision',type:'trace',kind:'message',label:'Decision',detail:'Use one compact disclosure'},
  {id:'write',type:'trace',kind:'write',label:'Draft component',detail:'components/agents/run-log.tsx'},
  {id:'verify',type:'trace',kind:'run',label:'Validate types',detail:'bun run typecheck'},
  {id:'inspect',type:'trace',kind:'read',label:'Inspect preview',detail:'activity-preview.png'},
]
const fixtures:Record<string,ActivityItem[]> = {
  'streaming-text': [{id:'text',type:'text',content:text}],
  'reasoning-steps':steps,'web-search':searches,'tool-calls':tools,'agent-trace':trace,
  'mixed-activity': [
    {id:'brief',type:'step',status:'complete',label:'Reading the launch brief'},
    {id:'search',type:'search',query:'Independent coffee roasters in Portland',results:[{id:'heart',title:'Heart Coffee',domain:'heartroasters.com'},{id:'coava',title:'Coava Coffee',domain:'coavacoffee.com'}]},
    ...tools,{id:'final',type:'step',status:'complete',label:'Checking the final campaign plan'},
  ],
}
const run = ref(0)
const progress = ref(0)
const mounted = ref(false)
const reduced = ref(false)
const available = computed(() => fixtures[variant.value])
const streaming = computed(() => variant.value==='streaming-text')
const total = computed(() => streaming.value ? text.length : available.value.length)
const complete = computed(() => progress.value >= total.value)
const items = computed<ActivityItem[]>(() => streaming.value ? [{id:'text',type:'text',content:text.slice(0,progress.value)}] : available.value.slice(0,progress.value))
onMounted(() => { reduced.value=matchMedia('(prefers-reduced-motion:reduce)').matches; mounted.value=true })
watch([variant,run,mounted],(_,__,cleanup) => {
  if (!mounted.value) return
  progress.value=0
  if (reduced.value) { progress.value=total.value; return }
  const timer = setInterval(() => {
    progress.value=Math.min(total.value,progress.value+(streaming.value ? 5 : 1))
    if (complete.value) clearInterval(timer)
  },streaming.value ? 55 : 650)
  cleanup(() => clearInterval(timer))
})
</script>

<template>
  <div class="be-agent-demo be-block-stack" :data-example-variant="variant">
    <label>Example <select :value="variant" @change="choose(($event.target as HTMLSelectElement).value)"><option v-for="option in options" :key="option">{{ option }}</option></select></label>
    <AgentActivity :key="`${variant}-${run}`" :items="items" :content-type="variant==='mixed-activity'?'mixed':available[0]?.type" :status="complete?'complete':'working'" :duration="Math.ceil(progress * (streaming ? .011 : .65))" :default-open="reduced" :collapse-on-complete="!reduced" />
    <button type="button" class="be-agent-button" @click="run++">Replay</button>
  </div>
</template>
