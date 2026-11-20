<script setup lang="ts">
import {useId} from 'vue'
const symbol=useId()
</script>
<template>
  <button type="button" class="be-chevron">
    <svg width="0" height="0" aria-hidden="true"><defs><g :id="symbol" fill="currentColor"><circle v-for="([left,top],index) in [[4,4],[10,9],[16,14],[10,19],[4,24]]" :key="index" :cx="left" :cy="top" r="2"/></g></defs></svg>
    <span class="chip" aria-hidden="true"><svg v-for="(opacity,index) in [1,.78,.54,.32,.16]" :key="opacity" viewBox="0 0 20 28" :style="{'--alpha':opacity,'--delay':`${40+index*25}ms`}"><use :href="`#${symbol}`"/></svg></span>
    <span class="text"><slot/></span>
  </button>
</template>
<style scoped>
.be-chevron{position:relative;display:inline-flex;align-items:center;min-width:min(18rem,100%);height:4rem;padding:0 1.25rem 0 76px;border:0;border-radius:22px;background:#0a0a0a;color:white;cursor:pointer;font:500 1.125rem/1.2 inherit}.chip{position:absolute;inset:6px auto 6px 6px;width:52px;overflow:hidden;border-radius:16px;background:#bef264;color:#0a0a0a;display:flex;align-items:center;justify-content:space-around;transition:width .36s cubic-bezier(.16,1,.3,1)}.chip svg{flex:none;width:20px;height:28px;display:none}.chip svg:first-child{display:block}.text{transition:opacity .12s}.be-chevron:focus-visible .chip{width:calc(100% - 12px)}.be-chevron:focus-visible .chip svg{display:block;opacity:var(--alpha)}.be-chevron:focus-visible .text{opacity:0}@media(hover:hover){.be-chevron:enabled:hover .chip{width:calc(100% - 12px)}.be-chevron:enabled:hover .chip svg{display:block;opacity:var(--alpha);animation:appear .18s var(--delay) backwards}.be-chevron:enabled:hover .text{opacity:0}}@keyframes appear{from{opacity:0;transform:translateX(-6px)}}@media(prefers-reduced-motion:reduce){.chip,.text,.chip svg{transition:none!important;animation:none!important}}
</style>
