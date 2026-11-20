<script setup lang="ts">
import { ref } from 'vue'
import { Bookshelf } from 'beui-vue'
const selected = ref<string | null>('middlemarch')
const sound = ref(true)
const books = [
  { id:'walden', title:'Walden', author:'Henry David Thoreau', color:'#5b6248', thickness:38 },
  { id:'meditations', title:'Meditations', author:'Marcus Aurelius', color:'#2f3a4a', thickness:34 },
  { id:'war', title:'The Art of War', author:'Sun Tzu', color:'#b5452f', thickness:28 },
  { id:'middlemarch', title:'Middlemarch', author:'George Eliot', color:'#e3d7b8', thickness:52 },
  { id:'whale', title:'Moby-Dick', author:'Herman Melville', color:'#1f4e79', thickness:48 },
  { id:'frankenstein', title:'Frankenstein', author:'Mary Shelley', color:'#3b3b3b', thickness:36 },
  { id:'prince', title:'The Prince', author:'Niccolò Machiavelli', color:'#d9a93f', thickness:30 },
  { id:'leaves', title:'Leaves of Grass', author:'Walt Whitman', color:'#3f6b4f', thickness:42 },
  { id:'liberty', title:'On Liberty', author:'John Stuart Mill', color:'#8a8174', thickness:32 },
  { id:'odyssey', title:'The Odyssey', author:'Homer', color:'#7a3b2e', thickness:46 },
]
</script>
<template><div class="demo"><Bookshelf v-model="selected" :books="books" :sound="sound" /><p>Click a book to pull it out. Arrow keys browse the shelf.</p><label><input v-model="sound" type="checkbox"> Sound</label></div></template>
<style scoped>.demo { width:100%; text-align:center; } p,label { font-size:.8rem; color:var(--beui-muted-foreground); }</style>
