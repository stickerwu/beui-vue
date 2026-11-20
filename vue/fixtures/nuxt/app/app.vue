<script setup lang="ts">
import { ButtonBase, Checkbox, Drawer, Tabs, type ChoiceOption } from 'beui-vue'

const count = ref(0)
const ready = ref(false)
const notifications = ref(false)
const opened = ref(false)
const activeTab = ref('overview')
const tabs = [
  { value: 'overview', label: 'Overview', content: 'Consumer overview' },
  { value: 'activity', label: 'Activity', content: 'Recent activity' },
] satisfies (ChoiceOption & { content: string })[]
onMounted(() => { ready.value = true })
</script>

<template>
  <main :data-ready="ready">
    <ButtonBase @click="count++">Packed count {{ count }}</ButtonBase>
    <Tabs v-model="activeTab" :items="tabs" :labels="{ list: 'Consumer navigation' }" />
    <output aria-label="Selected tab">{{ activeTab }}</output>
    <Checkbox v-model="notifications" label="Email updates" description="Receive a weekly summary." />
    <output aria-label="Notification preference">{{ notifications ? 'Enabled' : 'Off' }}</output>
    <ButtonBase @click="opened = true">Open details</ButtonBase>
    <Drawer v-model:open="opened" label="Account details" side="right" v-slot="{ close }">
      <p>Account information</p>
      <ButtonBase @click="close">Close details</ButtonBase>
    </Drawer>
  </main>
</template>
