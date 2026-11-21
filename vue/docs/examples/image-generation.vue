<script setup lang="ts">
import { ImageGeneration } from 'beui-vue'
import { onMounted, shallowRef, watch } from 'vue'

type Status = 'queued' | 'generating' | 'refining' | 'complete' | 'error'
const run = shallowRef(0)
const status = shallowRef<Status>('complete')
const mounted = shallowRef(false)
onMounted(() => { mounted.value = true })
watch([run, mounted], (_, __, cleanup) => {
  if (!mounted.value) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { status.value = 'complete'; return }
  status.value = 'queued'
  const timers = [setTimeout(() => { status.value = 'generating' }, 500), setTimeout(() => { status.value = 'refining' }, 3000), setTimeout(() => { status.value = 'complete' }, 5200)]
  cleanup(() => timers.forEach(clearTimeout))
}, { immediate: true })
</script>

<template>
  <div style="width:100%;max-width:36rem">
    <div :key="run" style="display:flex;width:100%;flex-direction:column;align-items:center">
      <ImageGeneration label="A quiet mountain landscape at sunset" prompt="a quiet mountain landscape at sunset" resolution="1024 × 1024" :status="status" @retry="run++">
        <svg viewBox="0 0 800 600" aria-hidden="true" style="width:100%;height:100%" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="image-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#191b33" /><stop offset="0.48" stop-color="#60538d" /><stop offset="1" stop-color="#e59b7b" /></linearGradient>
            <linearGradient id="image-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#314946" /><stop offset="1" stop-color="#101817" /></linearGradient>
            <radialGradient id="image-glow"><stop offset="0" stop-color="#ffe6b2" stop-opacity="0.95" /><stop offset="1" stop-color="#efb47e" stop-opacity="0" /></radialGradient>
          </defs>
          <rect width="800" height="600" fill="url(#image-sky)" />
          <circle cx="570" cy="210" r="150" fill="url(#image-glow)" />
          <circle cx="570" cy="210" r="54" fill="#ffe5ad" />
          <path d="M0 395 120 314l92 54 132-143 116 126 78-66 92 88 170-61v288H0Z" fill="#283d43" opacity="0.9" />
          <path d="M0 432 118 376l99 73 115-97 107 92 112-52 108 68 141-48v188H0Z" fill="url(#image-ground)" />
          <path d="M0 505c116-44 190-32 280 6 103 44 212 47 330-7 68-31 126-37 190-28v124H0Z" fill="#13201f" />
          <g fill="#c9d7c3" opacity="0.65"><circle cx="108" cy="142" r="2" /><circle cx="168" cy="102" r="1.5" /><circle cx="248" cy="154" r="2" /><circle cx="332" cy="84" r="1.5" /><circle cx="414" cy="138" r="2" /></g>
        </svg>
      </ImageGeneration>
      <button type="button" class="be-agent-replay-pill" @click="run++"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Replay</button>
    </div>
  </div>
</template>
