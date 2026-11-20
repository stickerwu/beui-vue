<script setup lang="ts">
import { ToolResult, ToolResultOutput } from 'beui-vue'
import { ref } from 'vue'
const status = ref<'error' | 'success'>('error')
const output = '$ pnpm test\n✓ All component tests passed.'
</script>
<template><div class="be-agent-demo"><ToolResult tool="terminal" title="Run the test suite" status="success" meta="1.4s" :copy-text="output"><ToolResultOutput>{{ output }}</ToolResultOutput></ToolResult><ToolResult tool="HTTP" title="Fetch catalog" kind="request" :status="status" @retry="status = 'success'"><ToolResultOutput>{{ status === 'error' ? '503 Service unavailable' : '200 OK' }}</ToolResultOutput></ToolResult></div></template>
