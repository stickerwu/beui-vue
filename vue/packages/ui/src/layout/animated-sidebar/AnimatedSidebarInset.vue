<template>
  <main data-slot="sidebar-inset" class="be-asb-inset"><slot /></main>
</template>

<style>
:where(.be-asb-inset) {
  position: relative; display: flex; flex: 1 1 0%; flex-direction: column; min-width: 0; min-height: 100svh;
  background: var(--beui-background);
}
@media (min-width: 768px) {
  .be-asb[data-variant=inset] ~ .be-asb-inset { margin: .5rem .5rem .5rem 0; border-radius: 1rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / .05); }
}
</style>
