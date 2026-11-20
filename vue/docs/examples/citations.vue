<script setup lang="ts">
import { Citation, Citations } from 'beui-vue'
const citations = [{ id:'vue', title:'Vue documentation', domain:'vuejs.org', url:'https://vuejs.org/guide/introduction.html' }, { id:'mdn', title:'MDN Web Docs', domain:'developer.mozilla.org', url:'https://developer.mozilla.org/en-US/docs/Web/Accessibility' }]
</script>
<template><div class="be-agent-demo"><p>Vue’s component model supports reusable interface patterns.<Citation id-prefix="framework" citation-id="vue" :index="1" /></p><Citations :citations="citations" id-prefix="framework" /></div></template>
