import { onBeforeUnmount, ref, watch, unref, MaybeRef } from 'vue'

export const useDelayBlockScreen = (show: MaybeRef<boolean>, delay: number) => {
  const enabled = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null

  const clear = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  watch(
    () => unref(show),
    (show_) => {
      clear()
      enabled.value = false

      if (show_) {
        timer = setTimeout(() => {
          enabled.value = true
        }, delay)
      }
    },
    { immediate: true }
  )

  // Cleanup saat component unmount
  onBeforeUnmount(clear)

  return { enabled }
}
