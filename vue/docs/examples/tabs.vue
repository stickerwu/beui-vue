<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'beui-vue'
import { LucideIcon } from './layout-icons'

const overflowTabs = ['Overview', 'Activity', 'Analytics', 'Members', 'Billing', 'Settings']
</script>

<template>
  <div class="tab-demos">
    <div class="section">
      <span class="caption">Pill</span>
      <Tabs default-value="overview" variant="pill">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" class="panel">High-level summary.</TabsContent>
        <TabsContent value="activity" class="panel">Recent events.</TabsContent>
        <TabsContent value="settings" class="panel">Preferences.</TabsContent>
      </Tabs>
    </div>
    <div class="section">
      <span class="caption">Overflow</span>
      <Tabs default-value="Overview" class="overflow">
        <TabsList>
          <TabsTrigger v-for="label in overflowTabs" :key="label" :value="label">{{ label }}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
    <div class="section">
      <span class="caption">Segment</span>
      <Tabs default-value="day" variant="segment">
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
    <div class="section">
      <span class="caption">Icon on selected</span>
      <Tabs default-value="home" variant="pill" icons="selected">
        <TabsList>
          <TabsTrigger value="home"><template #icon><LucideIcon name="Home" :size="14" /></template>Home</TabsTrigger>
          <TabsTrigger value="stats"><template #icon><LucideIcon name="BarChart3" :size="14" /></template>Stats</TabsTrigger>
          <TabsTrigger value="alerts"><template #icon><LucideIcon name="Bell" :size="14" /></template>Alerts</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
    <div class="section">
      <span class="caption">Underline</span>
      <Tabs default-value="all" variant="underline">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  </div>
</template>

<style scoped>
.tab-demos { display: flex; width: 100%; max-width: 28rem; min-width: 0; flex-direction: column; gap: 2rem; }
.section { display: flex; min-width: 0; flex-direction: column; gap: .5rem; }
.overflow { width: 100%; max-width: 20rem; }
.panel { font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.caption { font-size: .625rem; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--beui-muted-foreground); }
</style>
