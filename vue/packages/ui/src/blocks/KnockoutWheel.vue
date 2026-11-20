<script setup lang="ts">
import { computed, ref } from 'vue'
import { crest, score, type TournamentRound, type TournamentTeam } from './tournament'
const props = withDefaults(defineProps<{
  rounds: TournamentRound[]
  initialRound?: number
  labels?: Record<string, string>
}>(), { initialRound: 0 })
const selected = ref('')
const drawing = computed(() => {
  const first = Math.max(0, Math.min(props.initialRound, props.rounds.length - 1))
  const rounds = props.rounds.slice(first)
  const rim = rounds[0]?.matches.flatMap(match => [match.home.team, match.away.team]) ?? []
  const nodes: { id: string, x: number, y: number, team: TournamentTeam | null, text: string }[] = []
  const paths: string[] = []
  function node(id: string, fraction: number, radius: number, team: TournamentTeam | null, text: string) {
    const angle = fraction * Math.PI * 2 - Math.PI / 2
    const entry = { id, x: 150 + radius * Math.cos(angle), y: 150 + radius * Math.sin(angle), team, text }
    nodes.push(entry)
    return entry
  }
  let previous = rim.map((team,index) => node(`rim-${index}`, index/rim.length, 132, team, team?.name ?? props.labels?.tbd ?? 'TBD'))
  rounds.forEach((round,depth) => {
    previous = round.matches.map((match,index) => {
      const span = 2 ** (depth + 1)
      const text = `${round.name} · ${match.home.team?.name ?? 'TBD'} ${score(match.home)} – ${score(match.away)} ${match.away.team?.name ?? 'TBD'}`
      const current = node(match.id, (index * span + (span - 1) / 2) / rim.length,
        132 * (1 - (depth + 1)/rounds.length), match.winner ? match[match.winner].team : null, text)
      for (const child of previous.slice(index * 2, index * 2 + 2)) paths.push(`M ${child.x} ${child.y} L ${current.x} ${current.y}`)
      return current
    })
  })
  return { nodes, paths }
})
const current = computed(() => drawing.value.nodes.find(node => node.id === selected.value) ?? drawing.value.nodes.at(-1))
</script>

<template>
  <figure class="be-block be-wheel">
    <div class="wheel" role="group" :aria-label="labels?.label ?? 'Tournament wheel'">
      <svg viewBox="0 0 300 300" aria-hidden="true"><path v-for="path in drawing.paths" :key="path" :d="path" /></svg>
      <button v-for="node in drawing.nodes" :key="node.id" type="button" :aria-label="node.text" :aria-pressed="current?.id === node.id"
        :style="{ left: `${node.x/3}%`, top: `${node.y/3}%` }" @focus="selected=node.id" @pointerenter="selected=node.id" @click="selected=node.id">
        <img v-if="crest(node.team)" :src="crest(node.team)" alt=""><span v-else>{{ node.team?.name.slice(0,2) ?? '◇' }}</span>
      </button>
    </div>
    <figcaption aria-live="polite">{{ current?.text }}</figcaption>
  </figure>
</template>

<style scoped>
.be-wheel { margin:0; text-align:center; }
.wheel { position:relative; max-width:25rem; margin:auto; aspect-ratio:1; }
svg { width:100%; height:100%; }
path { fill:none; stroke:var(--beui-border); stroke-width:1.5; }
button { position:absolute; width:8%; aspect-ratio:1; transform:translate(-50%,-50%); border-radius:50%; border:1px solid var(--beui-border); background:var(--beui-background); cursor:pointer; color:inherit; font:inherit; font-size:.7rem; }
button[aria-pressed=true] { outline:2px solid var(--beui-ring); }
img { width:80%; height:70%; object-fit:contain; margin:auto; }
</style>
