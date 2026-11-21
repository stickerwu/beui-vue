<script setup lang="ts">
import { ref } from 'vue'
import { MorphingModal } from 'beui-vue'

type View = 'options' | 'private-key' | 'recovery' | null
const view = ref<View>(null)
const words = ['mountain', 'river', 'candle', 'harbor', 'amber', 'violet', 'spring', 'ocean', 'marble', 'thunder', 'willow', 'crystal']
</script>

<template>
  <div class="demo">
    <button type="button" class="open press" @click="view = 'options'">Open wallet options</button>
    <p class="note">Click a row. The modal morphs height to match new content.</p>

    <MorphingModal v-model:view-id="view" v-slot="{ view: current, close }">
      <div v-if="current === 'options'">
        <div class="header">
          <h2>Options</h2>
          <button type="button" class="x" aria-label="Close" @click="close">✕</button>
        </div>
        <div class="rows">
          <button type="button" class="row press" @click="view = 'private-key'">
            <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            View Private Key
          </button>
          <button type="button" class="row press" @click="view = 'recovery'">
            <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></svg>
            View Recovery Phrase
          </button>
          <button type="button" class="row destructive press" @click="close">
            <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H8c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
            Remove Wallet
          </button>
        </div>
      </div>

      <div v-else-if="current === 'private-key'">
        <div class="top">
          <svg class="i big" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          <button type="button" class="x" aria-label="Back" @click="view = 'options'">✕</button>
        </div>
        <h2 class="title">Private Key</h2>
        <p class="body">Your Private Key is the key used to back up your wallet. Keep it secret and secure at all times.</p>
        <hr>
        <ul class="list">
          <li><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg> Keep your private key safe</li>
          <li><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></svg> Don't share it with anyone else</li>
          <li><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg> If you lose it, we can't recover it</li>
        </ul>
        <div class="actions">
          <button type="button" class="cta soft press" @click="view = 'options'">Cancel</button>
          <button type="button" class="cta solid press" @click="view = 'options'">
            <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /></svg>
            Reveal
          </button>
        </div>
      </div>

      <div v-else-if="current === 'recovery'">
        <div class="top">
          <svg class="i big" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></svg>
          <button type="button" class="x" aria-label="Back" @click="view = 'options'">✕</button>
        </div>
        <h2 class="title">Recovery Phrase</h2>
        <p class="body">12 words you can use to restore your wallet on any device. Write them down somewhere safe.</p>
        <div class="words">
          <div v-for="(word, index) in words" :key="word" class="word"><span>{{ index + 1 }}.</span> {{ word }}</div>
        </div>
        <button type="button" class="cta solid full press" @click="view = 'options'">Done</button>
      </div>
    </MorphingModal>
  </div>
</template>

<style scoped>
.demo { display: flex; flex-direction: column; align-items: center; gap: .75rem; }
.demo > p { margin: 0; }
button { font: inherit; cursor: pointer; }
.press { transition: transform 120ms cubic-bezier(.16, 1, .3, 1), background-color .15s, border-color .15s; }
.press:active { transform: scale(.97); }
.open { display: inline-flex; box-sizing: border-box; align-items: center; height: 2.5rem; padding: 0 1.25rem; border: 1px solid var(--beui-border); border-radius: 999px; background: var(--beui-card); color: var(--beui-foreground); font-size: .875rem; font-weight: 500; line-height: 1.25rem; }
.open:hover { border-color: color-mix(in srgb, var(--beui-foreground) 18%, transparent); }
.note { font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.i { width: 1rem; height: 1rem; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.i.big { width: 1.25rem; height: 1.25rem; color: var(--beui-foreground); }
h2 { margin: 0; color: var(--beui-foreground); }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.header h2 { font-size: 1rem; line-height: 1.5rem; font-weight: 600; }
.x { display: inline-flex; width: 1.75rem; height: 1.75rem; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 999px; background: transparent; color: var(--beui-muted-foreground); font-size: 1rem; }
.x:hover { background: color-mix(in srgb, var(--beui-foreground) 6%, transparent); }
.rows { display: flex; flex-direction: column; gap: .5rem; }
.row { display: flex; box-sizing: border-box; width: 100%; align-items: center; gap: .75rem; padding: .75rem 1rem; border: 0; border-radius: 1rem; background: color-mix(in srgb, var(--beui-foreground) 4%, transparent); color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; font-weight: 500; text-align: left; }
.row:hover { background: color-mix(in srgb, var(--beui-foreground) 8%, transparent); }
.row.destructive { background: color-mix(in srgb, var(--beui-destructive) 10%, transparent); color: var(--beui-destructive); }
.row.destructive:hover { background: color-mix(in srgb, var(--beui-destructive) 15%, transparent); }
.top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: .75rem; }
.title { font-size: 1.25rem; line-height: 1.75rem; font-weight: 600; letter-spacing: -.025em; }
.body { margin: .5rem 0 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
hr { height: 0; margin: 1rem 0; border: 0; border-top: 1px solid var(--beui-border); }
.list { display: flex; flex-direction: column; gap: .625rem; margin: 0; padding: 0; list-style: none; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.list li { display: flex; align-items: center; gap: .625rem; margin: 0; padding: 0; line-height: 1.25rem; }
.actions { display: flex; gap: .5rem; margin-top: 1.25rem; }
.cta { display: inline-flex; box-sizing: border-box; height: 2.5rem; flex: 1; align-items: center; justify-content: center; gap: .5rem; padding: 0; border: 0; border-radius: 999px; font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
.cta.soft { background: color-mix(in srgb, var(--beui-foreground) 6%, transparent); color: var(--beui-foreground); }
.cta.solid { background: var(--beui-foreground); color: var(--beui-background); }
.cta.full { width: 100%; margin-top: 1.25rem; }
.words { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; margin-top: 1rem; }
.word { padding: .375rem .5rem; border: 1px solid var(--beui-border); border-radius: .5rem; background: color-mix(in srgb, var(--beui-background) 40%, transparent); color: var(--beui-foreground); font-size: .75rem; line-height: 1rem; }
.word span { margin-right: .25rem; color: var(--beui-muted-foreground); }
</style>
