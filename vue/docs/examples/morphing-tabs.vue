<script setup lang="ts">
import { ref } from 'vue'
import { MorphingTabs } from 'beui-vue'

const rooms: Record<string, { eyebrow: string; title: string; detail: string; accent: string }> = {
  'room-2': { eyebrow: 'quiet focus', title: 'Room 2', detail: 'A small space for the work that needs a little more air around it.', accent: '#db5b2f' },
  general: { eyebrow: 'shared space', title: 'General', detail: 'The common room for notes, links and the ideas that are still finding their shape.', accent: '#1bb273' },
  archive: { eyebrow: 'kept close', title: 'Archive', detail: 'Past rooms stay available without competing with the conversations in motion.', accent: '#7a6de2' },
}

const items = ref(Object.entries(rooms).map(([id, room]) => ({ id, label: room.title })))
const value = ref<string | null>('room-2')

function reorder(ids: string[]) {
  const byId = new Map(items.value.map(item => [item.id, item]))
  items.value = ids.flatMap(id => { const item = byId.get(id); return item ? [item] : [] })
}
function close(id: string) {
  const next = items.value.filter(item => item.id !== id)
  if (id === value.value) value.value = next[0]?.id ?? null
  items.value = next
}
</script>

<template>
  <div class="rooms-stage">
    <MorphingTabs v-model="value" :items="items" aria-label="Rooms" class-name="rooms-tabs" :on-close="close" @order-change="reorder">
      <template #content="{ item }">
        <div class="room-panel">
          <div class="room-copy">
            <p class="room-eyebrow">{{ rooms[item.id]?.eyebrow }}</p>
            <h3 class="room-title">{{ rooms[item.id]?.title }}</h3>
            <p class="room-detail">{{ rooms[item.id]?.detail }}</p>
            <div class="room-hint"><span class="room-dot" :style="{ backgroundColor: rooms[item.id]?.accent }" />drag any room to reorder</div>
          </div>
        </div>
      </template>
    </MorphingTabs>
  </div>
</template>

<style scoped>
.rooms-stage { display: flex; width: 100%; min-width: 0; align-items: center; justify-content: center; background: #242424; padding: .75rem; }
.rooms-stage :deep(.rooms-tabs) { width: 100%; max-width: 64rem; }
.room-panel { position: relative; min-height: 16rem; overflow: hidden; background-image: radial-gradient(circle at 1px 1px, #dfe2e3 1px, transparent 1.5px); background-size: 4.8rem 4.8rem; padding: 2rem 1.75rem; }
.room-copy { position: relative; max-width: 36rem; }
.room-eyebrow { margin: 0; font-size: .68rem; font-weight: 600; line-height: 1.5; letter-spacing: .24em; text-transform: uppercase; color: rgb(0 0 0 / .4); }
.room-title { margin: .75rem 0 0; border: 0; padding: 0; font-size: 1.875rem; line-height: 2.25rem; font-weight: 300; letter-spacing: -.055em; color: #151515; }
.room-detail { margin: 1rem 0 0; max-width: 28rem; font-size: .875rem; line-height: 1.5rem; color: rgb(0 0 0 / .55); }
.room-hint { margin-top: 2rem; display: flex; align-items: center; gap: .75rem; font-size: .75rem; line-height: 1rem; font-weight: 500; color: rgb(0 0 0 / .5); }
.room-dot { width: .5rem; height: .5rem; border-radius: 9999px; }
@media (min-width: 768px) {
  .rooms-stage { padding: 2rem; }
  .room-panel { padding: 2.5rem 3rem; }
  .room-title { font-size: 3rem; line-height: 1; }
  .room-detail { font-size: 1rem; }
}
</style>
