<script setup lang="ts">
import { ProjectFolder } from 'beui-vue'
const previews = [{id:'brief',content:'Project brief'},{id:'assets',content:'Design assets'},{id:'notes',content:'Meeting notes'}]
</script>
<template><ProjectFolder title="Studio files" description="Spring release" :previews="previews" :count="3" /></template>
