<script setup lang="ts">
import { computed } from 'vue'
import CrashBalloonMini from './CrashBalloonMini.vue'
import CrashBalloonStage from './CrashBalloonStage.vue'
import CrashFlightMini from './CrashFlightMini.vue'
import CrashFlightStage from './CrashFlightStage.vue'
import CrashShell from './CrashShell.vue'
import CrashTowerMini from './CrashTowerMini.vue'
import CrashTowerStage from './CrashTowerStage.vue'
import { useCrashGame, type CrashEmit, type CrashProps } from './crash-round'

// One game, three designs: the clock, the crash point and the controls are shared; a design only draws its stage.
const props = withDefaults(defineProps<CrashProps & { design: 'flight' | 'balloon' | 'tower' }>(), { sound: undefined })
const emit = defineEmits<{
  start: [round: number]; cashOut: [value: number]; crash: [point: number, payout: number | null]
  'update:autoCashOut': [value: number | null]; autoCashOutChange: [value: number | null]; 'update:sound': [value: boolean]; soundChange: [value: boolean]
}>()
const game = useCrashGame(props, emit as CrashEmit)
const slot = computed(() => (props.design === 'flight' ? 'crash' : `crash-${props.design}`))
const label = computed(() => props['aria-label'] ?? game.text('region'))
const Stage = computed(() => ({ flight: CrashFlightStage, balloon: CrashBalloonStage, tower: CrashTowerStage })[props.design])
const Mini = computed(() => ({ flight: CrashFlightMini, balloon: CrashBalloonMini, tower: CrashTowerMini })[props.design])
</script>

<template>
  <div class="crash-game" :data-slot="slot" :data-phase="game.phase">
    <CrashShell :game="game" :label="label">
      <component :is="Stage" :game="game" />
      <template #miniature="miniature"><component :is="Mini" v-bind="miniature" /></template>
    </CrashShell>
  </div>
</template>

<style scoped>
.crash-game { width: 100%; max-width: 28rem; }
</style>
