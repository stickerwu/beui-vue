<script setup lang="ts">
import { AvatarGroup } from 'beui-vue'
const members = [
  ['maya','Maya Chen','1494790108377-be9c29b29330'],['leo','Leo Hart','1507003211169-0a1dd7228f2d'],
  ['ines','Ines Duarte','1438761681033-6461ffad8d80'],['sam','Sam Okafor','1500648767791-00dcc994a43e'],
  ['noah','Noah Berg','1472099645785-5658abf4ff4e'],['aria','Aria Patel',''],
  ['zoe','Zoe Laurent','1534528741775-53994a69daeb'],['kai','Kai Moreno',''],
].map(([id, name, photo]) => ({ id: id!, name: name!, src: photo ? `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=96&h=96&q=80` : undefined }))
</script>
<template><AvatarGroup :members="members" :max="4" size="lg" label="Project members" /></template>
