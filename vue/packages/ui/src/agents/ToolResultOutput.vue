<script setup lang="ts">
defineProps<{ language?: string }>()
</script>
<template><pre class="be-agent-code" :data-language="language"><code><slot /></code></pre></template>
