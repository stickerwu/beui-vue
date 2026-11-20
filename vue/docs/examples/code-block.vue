<script setup lang="ts">
import { CodeBlock } from 'beui-vue'
const code = `export function greet(name: string) {\n  const message = "Welcome back"\n  return message + ", " + name\n}`
</script>
<template><CodeBlock filename="greet.ts" language="typescript" :code="code" :highlight-lines="[2]" /></template>
