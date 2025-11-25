<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  timeSettings: {
    work: number
    shortBreak: number
    longBreak: number
  }
}

const emit = defineEmits<{
  (e: 'update-time-settings', data: Props['timeSettings']): void
  (e: 'close'): void
}>()

const props = defineProps<Props>()

const innerTimeSettings = ref({
  work: props.timeSettings.work / 60,
  shortBreak: props.timeSettings.shortBreak / 60,
  longBreak: props.timeSettings.longBreak / 60
})

const saveSettings = () => {
  emit('update-time-settings', {
    work: innerTimeSettings.value.work * 60,
    shortBreak: innerTimeSettings.value.shortBreak * 60,
    longBreak: innerTimeSettings.value.longBreak * 60
  })
}

const closeSettings = () => {
  emit('close')
}
</script>
<template>
  <form class="flex flex-col gap-4" @submit.prevent="saveSettings">
    <div>
      <label class="font-bold" for="workDuration">Work Duration in minutes</label>
      <input
        id="workDuration"
        v-model.number="innerTimeSettings.work"
        name="workDuration"
        class="w-full p-2 border border-gray-300 rounded-lg bg-white"
        type="text"
        required
        @input="innerTimeSettings.work = Number(String(innerTimeSettings.work).replace(/\D/g, ''))"
      />
    </div>
    <div>
      <label class="font-bold" for="shortBreakDuration">Short Break Duration in minutes</label>
      <input
        id="shortBreakDuration"
        v-model.number="innerTimeSettings.shortBreak"
        name="shortBreakDuration"
        class="w-full p-2 border border-gray-300 rounded-lg bg-white"
        type="text"
        required
        @input="
          innerTimeSettings.shortBreak = Number(
            String(innerTimeSettings.shortBreak).replace(/\D/g, '')
          )
        "
      />
    </div>
    <div>
      <label class="font-bold" for="longBreakDuration">Long Break Duration in minutes</label>
      <input
        id="longBreakDuration"
        v-model.number="innerTimeSettings.longBreak"
        name="longBreakDuration"
        class="w-full p-2 border border-gray-300 rounded-lg bg-white"
        type="text"
        required
        @input="
          innerTimeSettings.longBreak = Number(
            String(innerTimeSettings.longBreak).replace(/\D/g, '')
          )
        "
      />
    </div>
    <div class="flex justify-end gap-4">
      <button
        class="bg-white cursor-pointer hover:bg-gray-50 rounded-lg text-fuchsia-500 w-32 py-2 px-4 flex items-center justify-center shadow-lg transition-transform active:scale-95"
        type="button"
        @click="closeSettings"
      >
        Cancel
      </button>
      <button
        class="bg-gradient-primary cursor-pointer hover:opacity-90 rounded-lg text-white w-32 py-2 px-4 flex items-center justify-center shadow-lg transition-transform active:scale-95"
        type="submit"
      >
        Save
      </button>
    </div>
  </form>
</template>
