<script setup lang="ts">
import { ApprovalCard, type ApprovalAnswers, type ApprovalQuestion } from 'beui-vue'
import { ref } from 'vue'
const status = ref<'pending' | 'answered'>('pending')
const result = ref('')
const questions: ApprovalQuestion[] = [{ id:'target', title:'Which environment should we use?', options:[{value:'staging',label:'Staging'},{value:'preview',label:'Preview'}] }, { id:'note', title:'What should the reviewer know?', allowCustom:true, customPlaceholder:'Review note' }]
function submit(answers: ApprovalAnswers) {
  result.value = `${answers.target.selected[0]} · ${answers.note.custom}`
  status.value = 'answered'
}
</script>
<template><ApprovalCard title="Review the preview" :questions="questions" :status="status" :result="result" @submit="submit" @dismiss="status = 'pending'" /></template>
