<script setup lang="ts">
import ButtonBase from '../ButtonBase.vue'
const {state='idle',disabled,loadingText='Loading',successText='Success',errorText='Error'}=defineProps<{
  state?:'idle'|'loading'|'success'|'error'
  disabled?:boolean
  loadingText?:string
  successText?:string
  errorText?:string
}>()
</script>
<template>
  <ButtonBase :disabled="disabled || state==='loading'" :aria-busy="state==='loading'">
    <span class="status" aria-live="polite"><Transition name="swap" mode="out-in"><span :key="state">
      <template v-if="state==='idle'"><slot/> <slot name="icon"/></template>
      <template v-else><i aria-hidden="true" :class="{spin:state==='loading'}">{{ {loading:'◌',success:'✓',error:'×'}[state] }}</i> {{ {loading:loadingText,success:successText,error:errorText}[state] }}</template>
    </span></Transition></span>
  </ButtonBase>
</template>
<style scoped>
.status{display:inline-grid;overflow:clip}.status i{display:inline-block;font-style:normal}.spin{animation:rotate 1s linear infinite}.swap-enter-active,.swap-leave-active{transition:.16s ease-out}.swap-enter-from{opacity:0;transform:translateY(14px);filter:blur(3px)}.swap-leave-to{opacity:0;transform:translateY(-14px)}@keyframes rotate{to{transform:rotate(1turn)}}@media(prefers-reduced-motion:reduce){.spin{animation:none}.swap-enter-active,.swap-leave-active{transition:none}}
</style>
