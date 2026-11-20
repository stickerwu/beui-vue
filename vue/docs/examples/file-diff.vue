<script setup lang="ts">
import { FileDiff, type FileDiffLine } from 'beui-vue'
const lines: FileDiffLine[] = [{ id:'first', type:'context', oldLine:1, newLine:1, content:'export const settings = {' }, { id:'before', type:'removed', oldLine:2, content:'  retries: 1,' }, { id:'after', type:'added', newLine:2, content:'  retries: 3,' }, { id:'last', type:'context', oldLine:3, newLine:3, content:'}' }]
</script>
<template><FileDiff file="src/settings.ts" :lines="lines" status="complete" /></template>
