<script setup lang="ts">
import { KnockoutWheel, type TournamentRound } from 'beui-vue'
const names = ['Atlas','North','Cedar','Ocean','West','Silver','East','Dawn']
const rounds:TournamentRound[] = []
let playing = [...names]
while (playing.length >= 2) {
  const round:TournamentRound = {name:playing.length===2?'Final':playing.length===4?'Semifinal':'Quarterfinal',matches:[]}
  for (let index=0; index<playing.length; index+=2) {
    round.matches.push({id:`${playing.length}-${index}`,home:{team:{name:playing[index]},score:2},away:{team:{name:playing[index+1]},score:1},winner:'home'})
  }
  rounds.push(round)
  playing = playing.filter((_,index) => index%2 === 0)
}
</script>
<template><KnockoutWheel :rounds="rounds" /></template>
