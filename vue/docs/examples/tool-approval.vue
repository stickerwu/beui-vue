<script setup lang="ts">
import { ToolApproval, type ToolApprovalStatus } from 'beui-vue'
import { ref } from 'vue'
const status = ref<ToolApprovalStatus>('pending')
const parameters = [{ id:'file', label:'File', value:'src/settings.ts' }, { id:'change', label:'Change', value:'Update the retry count' }]
</script>
<template><div class="be-agent-demo"><ToolApproval title="Edit configuration" tool="edit_file" description="The agent needs approval to edit the workspace." :parameters="parameters" :status="status" @approve="status = 'approved'" @always-allow="status = 'approved'" @deny="status = 'denied'" /><button v-if="status !== 'pending'" type="button" class="be-agent-button" @click="status = 'pending'">Reset approval</button></div></template>
