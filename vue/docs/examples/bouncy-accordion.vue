<script setup lang="ts">
import { ref } from 'vue'
import { BouncyAccordion } from 'beui-vue'
const active = ref<string|null>('brief')
const items = [
  {id:'brief',title:'Release Brief',description:'Review the goals, owners, and scope of this release.',icon:'▤'},
  {id:'checklist',title:'Launch Checklist',description:'Run the final checks before shipping.',icon:'☑'},
  {id:'notes',title:'Campaign Notes',description:'Collect messaging and creative direction.',icon:'✎'},
  {id:'calendar',title:'Rollout Calendar',description:'Coordinate announcements and staged rollout dates.',icon:'▦'},
  {id:'build',title:'Ship Build',description:'Prepare the production release.',icon:'↑'},
  {id:'archive',title:'Archive Assets',description:'Keep the source files for the next release.',icon:'▣'},
]
</script>
<template><BouncyAccordion v-model="active" :items="items" /></template>
