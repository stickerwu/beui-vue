<script setup lang="ts">
import { ref, watch } from 'vue'
import { ApprovalCard, type ApprovalAnswers, type ApprovalQuestion } from 'beui-vue'
import { useAgentVariant } from '../.vitepress/use-agent-variant'
const props = defineProps<{variant?:string}>()
const {variant,choose,options} = useAgentVariant(() => props.variant,{
  questions:'agents/approval-card-question',review:'agents/approval-card-review',
})
const status = ref<'pending'|'answered'|'approved'|'rejected'>('pending')
const result = ref('')
const run = ref(0)
const questions:ApprovalQuestion[] = [
  {id:'scope',title:'How focused should the first release be?',options:[
    {value:'focused',label:'A focused starter set',description:'Ship a few polished pieces first.'},
    {value:'broad',label:'A broader collection',description:'Cover more ground with lighter depth.'},
    {value:'flagship',label:'One flagship experience',description:'Pour everything into a single showcase.'},
  ],allowCustom:true,customPlaceholder:'Describe another scope…'},
  {id:'checks',title:'Which checks should block publishing?',multiple:true,options:[
    {value:'types',label:'Type safety'},{value:'accessibility',label:'Accessibility'},{value:'registry',label:'Registry validation'},
  ]},
  {id:'preserve',title:'Anything the agent should preserve?',allowCustom:true,customPlaceholder:'Add a final constraint…'},
]
function reset() {
  run.value++
  status.value='pending'
  result.value=''
}
function submit(answers:ApprovalAnswers) {
  result.value = [answers.scope?.custom || answers.scope?.selected.join(', '), answers.checks?.selected.join(', '), answers.preserve?.custom].filter(Boolean).join(' · ')
  status.value='answered'
}
function decide(decision:'approved'|'rejected',message:string) {
  status.value=decision
  result.value=message
}
watch(variant,reset)
</script>

<template>
  <div class="be-agent-demo be-block-stack" :data-example-variant="variant">
    <label>Example <select :value="variant" @change="choose(($event.target as HTMLSelectElement).value)"><option v-for="option in options" :key="option">{{ option }}</option></select></label>
    <ApprovalCard v-if="variant==='questions'" :key="run" title="Plan the first release" :questions="questions" :status="status" :result="result" @submit="submit" @dismiss="reset" />
    <ApprovalCard v-else :key="`review-${run}`" title="Publish the component update?" description="Review the registry change before publishing." :status="status" :result="result" @approve="decide('approved','Approved for publishing')" @reject="decide('rejected','Update rejected')" @request-changes="decide('rejected','Changes requested')" @dismiss="reset">
      <dl><dt>Checks</dt><dd>4 passed</dd><dt>Visibility</dt><dd>Public registry</dd></dl>
    </ApprovalCard>
    <button type="button" class="be-agent-button" @click="reset">Replay</button>
  </div>
</template>

<style scoped>dl {display:grid;grid-template-columns:1fr auto;gap:.4rem;margin:0}dt {color:var(--beui-muted-foreground)}dd {margin:0}</style>
