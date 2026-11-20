<script setup lang="ts">
import { ref } from 'vue'
import { OverflowActions } from 'beui-vue'
const selected = ref('')
const primary = [{id:'edit',label:'Edit'},{id:'save',label:'Save'}]
const overflow = [{id:'copy',label:'Duplicate'},{id:'archive',label:'Archive'}]
</script>
<template><div><OverflowActions :primary-actions="primary" :overflow-actions="overflow" @action="selected=$event.label" /><output>{{ selected }}</output></div></template>
