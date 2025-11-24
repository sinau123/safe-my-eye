<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Play, Pause, RotateCcw } from 'lucide-vue-next'
import { IPCEvents } from 'src/shared/events'

// --- Types ---
type TimerMode = 'work' | 'shortBreak' | 'longBreak'

// --- Constants ---
const TIMER_DURATIONS = {
  work: 25 * 60, // 25 minutes
  shortBreak: 1 * 60, // 1 minutes
  longBreak: 10 * 60 // 10 minutes
}

const pomodoroMaxCount = 5

const BREAK_MESSAGES = [
  'Look at something 20 feet away for 20 seconds 👁️',
  'Take a moment to stretch your body 🧘',
  'Rest your eyes and breathe deeply 🌬️',
  'Look out the window at something distant 🪟',
  'Close your eyes and relax for a moment 😌',
  'Focus on something green outside 🌿'
]

const sendIPC = (event: IPCEvents) => {
  window.electron.ipcRenderer.send(event)
}

const ipcHandler = {
  showOverlay: (): void => sendIPC('showOverlay'),
  hideOverlay: (): void => sendIPC('hideOverlay')
}

// --- State ---
const mode = ref<TimerMode>('work')
const timeLeft = ref(TIMER_DURATIONS.work)
const isRunning = ref(false)
const showBreakScreen = ref(false)
const breakMessage = ref('')
const pomodorosCompleted = ref(0)

let intervalId: ReturnType<typeof setInterval> | null = null

// --- Logic ---

const getProgress = computed(() => {
  const totalTime = TIMER_DURATIONS[mode.value]
  return ((totalTime - timeLeft.value) / totalTime) * 100
})

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const handleScreenOverlay = (show: boolean) => {
  showBreakScreen.value = show
  if (show) {
    ipcHandler.showOverlay()
  } else {
    ipcHandler.hideOverlay()
  }
}

const startTimer = () => {
  if (intervalId) {
    clearInterval(intervalId)
  }

  intervalId = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      handleTimerComplete()
    }
  }, 1000)
}

const pauseTimer = () => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  isRunning.value = false
}

const stopBreak = () => {
  handleScreenOverlay(false)
  mode.value = 'work'
  timeLeft.value = TIMER_DURATIONS.work
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  isRunning.value = false
}

const startBreak = () => {
  mode.value = 'shortBreak'
  timeLeft.value = TIMER_DURATIONS.shortBreak
  startTimer()
}

const startLongBreak = () => {
  mode.value = 'longBreak'
  timeLeft.value = TIMER_DURATIONS.longBreak
  startTimer()
}

const resetTimer = () => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  timeLeft.value = TIMER_DURATIONS['work']
  isRunning.value = false
}

const handleTimerComplete = () => {
  const randomMessage = BREAK_MESSAGES[Math.floor(Math.random() * BREAK_MESSAGES.length)]
  breakMessage.value = randomMessage

  if (mode.value === 'work') {
    pomodorosCompleted.value++
    handleScreenOverlay(true)

    if (pomodorosCompleted.value % pomodoroMaxCount === 0) {
      startLongBreak()
    } else {
      startBreak()
    }
  } else {
    handleScreenOverlay(false)
    stopBreak()
  }
}

const handleBreakContinue = () => {
  handleScreenOverlay(false)
  stopBreak()
}

// Cleanup on unmount
onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<template>
  <!-- Break Screen Overlay -->
  <div
    v-if="showBreakScreen"
    class="fixed inset-0 bg-gradient-primary flex items-center justify-center z-50 animate-fade-in"
  >
    <div class="text-center px-8 max-w-2xl">
      <div class="animate-pulse-glow">
        <h1 class="text-6xl md:text-8xl font-bold text-white mb-8">Time for a break!</h1>
        <h2 class="text-8xl font-bold text-white mb-4 select-none">
          {{ formatTime(timeLeft) }}
        </h2>
        <p class="text-2xl md:text-4xl text-white/90 font-bold mb-12">
          {{ breakMessage }}
        </p>
      </div>
      <button
        class="bg-white/20 hover:bg-white/30 text-white font-bold border-2 border-white/40 backdrop-blur-sm text-xl px-8 py-6 h-auto rounded-lg transition-colors"
        @click="handleBreakContinue"
      >
        Close & Continue working
      </button>
    </div>
  </div>

  <!-- Main Interface -->
  <div v-else class="min-h-screen bg-gradient-soft flex items-center justify-center p-4 font-sans">
    <div class="w-full max-w-lg">
      <!-- Timer Display -->
      <div
        class="bg-white/70 dark:bg-card/70 backdrop-blur-lg rounded-3xl p-12 mb-6 relative overflow-hidden shadow-glow"
      >
        <!-- Progress Ring -->
        <div class="absolute inset-0 opacity-20">
          <svg class="w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="url(#gradient)"
              stroke-width="8"
              :stroke-dasharray="`${getProgress * 2.827} 282.7`"
              class="transition-all duration-1000 ease-linear"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="hsl(345, 100%, 70%)" />
                <stop offset="100%" stop-color="hsl(270, 95%, 75%)" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div class="relative text-center z-10">
          <h2
            class="text-8xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4 select-none"
          >
            {{ formatTime(timeLeft) }}
          </h2>
          <p class="text-slate-500 text-lg font-medium">
            {{
              mode === 'work' ? 'Focus Time' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'
            }}
          </p>
          <p class="text-sm text-slate-400 mt-2">Pomodoros completed: {{ pomodorosCompleted }}</p>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex gap-4 justify-center">
        <button
          class="bg-gradient-primary hover:opacity-90 text-white w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
          @click="
            () => {
              if (isRunning) {
                pauseTimer()
              } else {
                isRunning = true
                startTimer()
              }
            }
          "
        >
          <Pause v-if="isRunning" class="w-12 h-12" />
          <Play v-else class="w-12 h-12 ml-1" />
        </button>

        <button
          class="w-24 h-24 rounded-full border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-sm"
          @click="resetTimer"
        >
          <RotateCcw class="w-8 h-8" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom Utility Classes mimicking the React setup */
.bg-gradient-primary {
  background-image: linear-gradient(135deg, hsl(345, 100%, 70%), hsl(270, 95%, 75%));
}

.bg-gradient-soft {
  background-image: linear-gradient(to bottom right, #fdfbfb, #ebedee);
}

.shadow-glow {
  box-shadow: 0 0 20px rgba(236, 72, 153, 0.2);
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes pulseGlow {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(0.98);
  }
}

.animate-pulse-glow {
  animation: pulseGlow 3s infinite ease-in-out;
}

/* Utility for text gradients */
.bg-clip-text {
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
