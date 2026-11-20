<script setup lang="ts">
import { KnockoutBracket, type TournamentRound } from 'beui-vue'
const rounds:TournamentRound[] = [
  {name:'Semifinal',matches:[
    {id:'semi-1',home:{team:{name:'Atlas'},score:2},away:{team:{name:'North'},score:1},winner:'home'},
    {id:'semi-2',home:{team:{name:'South'},score:1},away:{team:{name:'Coast'},score:3},winner:'away'},
  ]},
  {name:'Final',matches:[{id:'final',date:'June 21',home:{team:{name:'Atlas'},score:null},away:{team:{name:'Coast'},score:null}}]},
]
</script>
<template><KnockoutBracket :rounds="rounds" /></template>
