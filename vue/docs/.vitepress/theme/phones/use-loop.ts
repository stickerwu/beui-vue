import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

/**
 * Plays a looping script of timed steps while `playing` is true, the way the
 * upstream phones loop a recorded clip. Pausing holds the current state;
 * resuming continues where the clip stopped.
 */
export function useLoop(playing: Ref<boolean>, steps: readonly { at: number; run: () => void }[], length: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let index = 0
  let elapsed = 0
  let started = 0

  function schedule() {
    const step = steps[index]
    started = performance.now()
    timer = setTimeout(() => {
      if (step) {
        step.run()
        elapsed = step.at
        index += 1
      } else {
        index = 0
        elapsed = 0
      }
      schedule()
    }, Math.max(0, (step ? step.at : length) - elapsed))
  }

  function stop() {
    if (timer === undefined) return
    clearTimeout(timer)
    timer = undefined
    elapsed += performance.now() - started
  }

  onMounted(() => {
    watch(playing, play => (play ? schedule() : stop()), { immediate: true })
  })
  onBeforeUnmount(stop)
}
