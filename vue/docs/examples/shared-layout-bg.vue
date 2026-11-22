<script setup lang="ts">
import { SharedLayoutBg } from 'beui-vue'
import { LucideIcon } from './layout-icons'

const items = [
  { title: 'Inbox', body: '12 unread threads, 3 mentions today.' },
  { title: 'Drafts', body: '4 posts waiting for a final pass.' },
  { title: 'Releases', body: 'Last shipped 2 days ago, v0.4.1.' },
  { title: 'Billing', body: 'Plan renews on the 1st of next month.' },
]
</script>

<template>
  <div class="wrap">
    <SharedLayoutBg>
      <button v-for="item in items" :key="item.title" type="button" class="row">
        <div class="head">
          <span class="title">{{ item.title }}</span>
          <LucideIcon name="ArrowUpRight" :size="14" class="arrow" />
        </div>
        <p class="body">{{ item.body }}</p>
      </button>
    </SharedLayoutBg>
  </div>
</template>

<style scoped>
.wrap { width: 100%; max-width: 32rem; padding: 0 .5rem; box-sizing: border-box; }
.row { display: flex; flex-direction: column; gap: .25rem; padding: .75rem .5rem; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; outline: none; }
.head { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.title { font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.arrow { color: var(--beui-muted-foreground); transition: transform .15s cubic-bezier(.4, 0, .2, 1), translate .15s cubic-bezier(.4, 0, .2, 1); }
.row:hover .arrow { translate: .125rem -.125rem; }
.body { margin: 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
</style>
