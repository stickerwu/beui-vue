<script setup lang="ts">
import { ref } from 'vue'
import { SwipeableList } from 'beui-vue'
const result = ref('')
const rows = ['Design review','Release notes','Project brief'].map((title,index) => ({
  id:String(index),title,description:'Studio inbox',leftActions:[{id:'save',label:'Save'}],rightActions:[{id:'archive',label:'Archive'}],
}))
</script>
<template><div><SwipeableList :items="rows" @action="result=`${$event.action.label} · ${$event.item.title}`" /><output>{{ result }}</output></div></template>
