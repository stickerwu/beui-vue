<script setup lang="ts">
import { ExpandableTabs } from 'beui-vue'
const tabs = [
  {id:'home',label:'Home',icon:'⌂',content:'Project overview'},
  {id:'inbox',label:'Inbox',icon:'✉',content:'No new messages'},
  {id:'saved',label:'Saved',icon:'☆',content:'Three saved items'},
]
</script>
<template><ExpandableTabs :items="tabs" default-value="home" /></template>
