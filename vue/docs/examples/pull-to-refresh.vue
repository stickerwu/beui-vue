<script setup lang="ts">
import { computed, ref } from 'vue'
import { PullToRefresh } from 'beui-vue'
import { LucideIcon } from './layout-icons'

const initialUpdates = [
  { id: 1, icon: 'GitPullRequest', title: 'Motion review approved', detail: 'The pull request is ready to merge.', time: '4m' },
  { id: 2, icon: 'MessageCircle', title: 'New component feedback', detail: 'The spring feels much closer to native now.', time: '18m' },
  { id: 3, icon: 'CheckCircle2', title: 'Registry checks passed', detail: 'All component files resolved successfully.', time: '31m' },
  { id: 4, icon: 'Bell', title: 'Preview deployed', detail: 'The latest build is ready to inspect.', time: '1h' },
  { id: 5, icon: 'MessageCircle', title: 'Docs comment resolved', detail: 'The usage example now covers async refreshes.', time: '2h' },
]

const refreshCount = ref(0)
const latestUpdate = ref<number | null>(null)
const updates = computed(() => latestUpdate.value
  ? [{ id: latestUpdate.value, icon: 'Bell', title: 'You’re all caught up', detail: 'The activity feed was refreshed just now.', time: 'now' }, ...initialUpdates]
  : initialUpdates)

async function refresh() {
  await new Promise(resolve => setTimeout(resolve, 900))
  refreshCount.value += 1
  latestUpdate.value = Date.now()
}
</script>

<template>
  <div class="stage">
    <div class="phone">
      <PullToRefresh aria-label="Activity feed" class-name="feed" :on-refresh="refresh">
        <header class="bar">
          <div>
            <p class="bar-title">Activity</p>
            <p class="bar-sub">Pull down to check for updates</p>
          </div>
          <span class="pill">{{ refreshCount ? `${refreshCount} refreshed` : 'live' }}</span>
        </header>
        <div class="list">
          <article v-for="update in updates" :key="update.id" class="item">
            <div class="icon"><LucideIcon :name="update.icon" :size="16" /></div>
            <div class="body">
              <div class="line">
                <p class="title">{{ update.title }}</p>
                <span class="time">{{ update.time }}</span>
              </div>
              <p class="detail">{{ update.detail }}</p>
            </div>
          </article>
        </div>
      </PullToRefresh>
    </div>
  </div>
</template>

<style scoped>
.stage { display: flex; min-height: 34rem; width: 100%; align-items: center; justify-content: center; padding: 1rem; box-sizing: border-box; }
.phone { width: 100%; max-width: 24rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 2rem; background: var(--beui-background); box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25); }
.phone :deep(.feed) { height: 30rem; }
p { margin: 0; }
.bar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid var(--beui-border); background: color-mix(in srgb, var(--beui-background) 90%, transparent); backdrop-filter: blur(12px); }
.bar-title { font-weight: 600; font-size: 1rem; line-height: 1.5rem; color: var(--beui-foreground); }
.bar-sub { font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.pill { border-radius: 9999px; background: var(--beui-muted); padding: .25rem .625rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; line-height: 1rem; color: var(--beui-muted-foreground); }
.list { padding: 0 .5rem .75rem; }
.item { display: flex; gap: .75rem; padding: 1rem .75rem; }
.item + .item { border-top: 1px solid var(--beui-border); }
.icon { display: grid; width: 2.25rem; height: 2.25rem; flex: none; place-items: center; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-card); color: var(--beui-muted-foreground); box-shadow: 0 1px 2px rgb(0 0 0 / .05); }
.body { min-width: 0; flex: 1; }
.line { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.title { font-size: .875rem; font-weight: 500; line-height: 1.25rem; color: var(--beui-foreground); }
.time { flex: none; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; line-height: 1rem; color: var(--beui-muted-foreground); }
.detail { margin-top: .25rem; font-size: .75rem; line-height: 1.625; color: var(--beui-muted-foreground); }
</style>
