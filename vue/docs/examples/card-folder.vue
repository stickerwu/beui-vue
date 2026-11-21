<script setup lang="ts">
import { ref } from 'vue'
import { CardFolder, DigitSwap } from 'beui-vue'

const CARD_NUMBER = '3745 6987 4096 0806'
const MASKED_CARD_NUMBER = '•••• •••• •••• 0806'
const CONTOUR_RADII = Array.from({ length: 18 }, (_, index) => 72 + index * 24)
const detailsVisible = ref(false)
</script>

<template>
  <div class="card-folder-stage">
    <CardFolder v-model:details-visible="detailsVisible" title="Saurabh Chauhan" :card-number="CARD_NUMBER" expiry="08/29" cvv="123">
      <template #card>
        <span class="art">
          <svg aria-hidden="true" viewBox="0 0 640 404" class="art-contours">
            <!-- The concentric contours deliberately begin outside the card so their cropped curves read like the reference artwork. -->
            <circle v-for="(radius, index) in CONTOUR_RADII" :key="radius" cx="-20" cy="-28" :r="radius" fill="none" stroke="currentColor"
              :stroke-opacity="0.32 - index * 0.009" stroke-width="1.5" />
          </svg>
          <span class="art-glow" />
          <span class="art-holder">
            <span class="art-name">Saurabh Chauhan</span>
            <DigitSwap :value="detailsVisible ? CARD_NUMBER : MASKED_CARD_NUMBER" :animation-key="detailsVisible ? 'revealed' : 'masked'"
              :direction="detailsVisible ? 'up' : 'down'" :suffix-length="4" :glyph-class-name="detailsVisible ? 'art-bright' : 'art-dim'"
              suffix-class-name="art-bright" class-name="art-number" />
          </span>
          <span class="art-chip">
            <span class="chip-v" /><span class="chip-h1" /><span class="chip-h2" /><span class="chip-l" /><span class="chip-r" />
          </span>
          <span class="art-brand">beUI <span class="art-diamond" /></span>
          <span class="art-foot">
            <span class="art-col"><span class="art-label">Expiry</span><span class="art-expiry">08/29</span></span>
            <span class="art-col"><span class="art-label">CVV</span>
              <DigitSwap :value="detailsVisible ? '123' : '•••'" :animation-key="detailsVisible ? 'revealed' : 'masked'"
                :direction="detailsVisible ? 'up' : 'down'" class-name="art-cvv" />
            </span>
          </span>
        </span>
      </template>
    </CardFolder>
  </div>
</template>

<style scoped>
.card-folder-stage { --font-mono: "Geist Mono Variable", "Geist Mono", ui-monospace, monospace; display: flex; min-height: 18rem; width: 100%; align-items: center; justify-content: center; box-sizing: border-box; padding: 2.25rem 1.5rem; }
.art { position: relative; display: block; width: 100%; height: 100%; overflow: hidden; background: linear-gradient(135deg, #383a38 0%, #202120 48%, #111211 100%); color: #fff; }
.art-contours { position: absolute; inset: 0; width: 100%; height: 100%; }
.art-glow { position: absolute; inset: 0; background: radial-gradient(circle at 78% 8%, rgb(255 255 255 / .11), transparent 32%); }
.art-holder { position: absolute; left: 6%; top: 8%; display: flex; flex-direction: column; gap: .5rem; }
.art-name { font-size: 10px; line-height: 1rem; font-weight: 500; letter-spacing: .22em; text-transform: uppercase; color: rgb(255 255 255 / .55); }
.art-number { font-family: var(--font-mono, ui-monospace, monospace); font-size: .75rem; line-height: 1rem; letter-spacing: .13em; }
.art-holder :deep(.art-dim) { color: rgb(255 255 255 / .65); }
.art-holder :deep(.art-bright) { color: rgb(255 255 255 / .9); }
.art-chip { position: absolute; top: 8%; right: 7%; width: 13%; height: 20%; overflow: hidden; border: 1px solid rgb(0 0 0 / .3); border-radius: 18%; background: linear-gradient(135deg, #f2f0ea 0%, #b9b7b1 45%, #e4e1d9 100%); }
.art-chip > span { position: absolute; background: rgb(0 0 0 / .3); }
.chip-v { top: 0; bottom: 0; left: 50%; width: 1px; transform: translateX(-50%); }
.chip-h1 { left: 0; right: 0; top: 33.333%; height: 1px; }
.chip-h2 { left: 0; right: 0; bottom: 33.333%; height: 1px; }
.art-chip > .chip-l, .art-chip > .chip-r { top: 50%; width: 28%; height: 34%; background: transparent; transform: translateY(-50%); border: 1px solid rgb(0 0 0 / .3); }
.chip-l { left: 0; border-left: 0 !important; border-radius: 0 35% 35% 0; }
.chip-r { right: 0; border-right: 0 !important; border-radius: 35% 0 0 35%; }
.art-brand { position: absolute; bottom: 9%; left: 6%; display: flex; align-items: center; gap: .5rem; font-size: 1.125rem; line-height: 1.75rem; font-weight: 600; letter-spacing: -.04em; }
.art-diamond { display: block; width: .625rem; height: .625rem; transform: rotate(45deg); border-radius: 2px; background: rgb(255 255 255 / .85); }
.art-foot { position: absolute; right: 7%; bottom: 10%; display: flex; align-items: flex-end; gap: 1.25rem; }
.art-col { display: flex; flex-direction: column; gap: .25rem; }
.art-label { font-size: 8px; line-height: 1rem; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; color: rgb(255 255 255 / .4); }
.art-expiry { font-size: .75rem; line-height: 1rem; font-weight: 500; font-variant-numeric: tabular-nums; color: rgb(255 255 255 / .9); }
.art-cvv { font-family: var(--font-mono, ui-monospace, monospace); font-size: .75rem; line-height: 1rem; font-weight: 500; color: rgb(255 255 255 / .9); }
</style>
