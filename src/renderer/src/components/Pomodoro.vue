<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Play, Pause, RotateCcw, Settings } from 'lucide-vue-next'
import { ReceiveIPCEvents, SendIPCEvents } from 'src/shared/events'
import { match } from 'ts-pattern'
import { IpcRendererListener } from '@electron-toolkit/preload'
import SettingsComponent from './Settings.vue'
import { useDelayBlockScreen } from '@renderer/hooks/useDelayBlockScreen'

// --- Constants ---
const timeSettings = ref({
  work: 20 * 60, // 20 minutes
  shortBreak: 1 * 60, // 1 minutes
  longBreak: 10 * 60, // 10 minutes
  autoPlayAfterBreak: false
})

const settings = localStorage.getItem('timeSettings')

if (settings) {
  try {
    timeSettings.value = JSON.parse(settings)
  } catch (error) {
    console.error('Error parsing settings:', error)
  }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sendIPC = (event: SendIPCEvents, ...args: any[]) => {
  window.electron.ipcRenderer.send(event, ...args)
}

const receiveIPC = (event: ReceiveIPCEvents, listener: IpcRendererListener) => {
  window.electron.ipcRenderer.on(event, listener)
}

const ipcHandler = {
  showOverlay: (): void => {
    sendIPC('showOverlay')
  },
  hideOverlay: (): void => {
    sendIPC('hideOverlay')
  },
  startTimer: (timeLeft: number): void => {
    sendIPC('timer:start', timeLeft)
  },
  pauseTimer: (): void => {
    sendIPC('timer:pause')
  },
  resetTimer: (): void => {
    sendIPC('timer:reset')
  },
  startBreakTimer: (duration: number): void => {
    sendIPC('timer-break:start', duration)
  },
  resetBreakTimer: (): void => {
    sendIPC('timer-break:reset')
  }
}

const timer = ref({
  work: {
    timeLeft: timeSettings.value.work,
    isRunning: false
  },
  break: {
    timeLeft: timeSettings.value.shortBreak,
    isRunning: false
  }
})
const showBreakScreen = ref(false)
const breakMessage = ref('')
const pomodorosCompleted = ref(0)
const settingsOpen = ref(false)

const handleIPCEvents = (event: ReceiveIPCEvents) => {
  match(event)
    .with('timer:tick', () => {
      receiveIPC(event, (_, timeLeft_) => {
        timer.value.work.timeLeft = timeLeft_
      })
    })
    .with('timer:done', () => {
      receiveIPC(event, () => {
        handleTimerComplete()
      })
    })
    .with('timer-break:tick', () => {
      receiveIPC(event, (_, timeLeft_) => {
        timer.value.break.timeLeft = timeLeft_
      })
    })
    .with('timer-break:done', () => {
      receiveIPC(event, () => {
        handleBreakTimerComplete()
      })
    })
    .otherwise(() => console.log('Unknown event'))
}

// --- Logic ---

const getProgress = computed(() => {
  const totalTime = timeSettings.value.work
  return ((totalTime - timer.value.work.timeLeft) / totalTime) * 100
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

const startTimer = (value?: number) => {
  timer.value.work.isRunning = true
  let value_ = timer.value.work.timeLeft
  if (value) {
    value_ = value
  }
  ipcHandler.startTimer(value_)
}

const pauseTimer = () => {
  timer.value.work.isRunning = false
  ipcHandler.pauseTimer()
}

const resetTimer = () => {
  timer.value.work.isRunning = false
  timer.value.work.timeLeft = timeSettings.value.work
  ipcHandler.resetTimer()
}

const stopBreak = () => {
  handleScreenOverlay(false)
  timer.value.work.timeLeft = timeSettings.value.work
  timer.value.break.timeLeft = timeSettings.value.shortBreak
  ipcHandler.resetBreakTimer()

  if (timeSettings.value.autoPlayAfterBreak) {
    startTimer()
  } else {
    pauseTimer()
  }
}

const startBreak = () => {
  timer.value.break.timeLeft = timeSettings.value.shortBreak
  ipcHandler.startBreakTimer(timeSettings.value.shortBreak)
  handleScreenOverlay(true)
}

const startLongBreak = () => {
  timer.value.break.timeLeft = timeSettings.value.longBreak
  ipcHandler.startBreakTimer(timeSettings.value.longBreak)
  handleScreenOverlay(true)
}

const handleTimerComplete = () => {
  const randomMessage = BREAK_MESSAGES[Math.floor(Math.random() * BREAK_MESSAGES.length)]
  breakMessage.value = randomMessage
  pomodorosCompleted.value++

  if (pomodorosCompleted.value % pomodoroMaxCount === 0) {
    startLongBreak()
  } else {
    startBreak()
  }
}

const handleBreakTimerComplete = () => {
  stopBreak()
}

const handleBreakContinue = () => {
  stopBreak()
}

onMounted(() => {
  handleIPCEvents('timer:tick')
  handleIPCEvents('timer:done')
  handleIPCEvents('timer-break:tick')
  handleIPCEvents('timer-break:done')
})

const saveSettings = (data: {
  work: number
  shortBreak: number
  longBreak: number
  autoPlayAfterBreak: boolean
}) => {
  timeSettings.value = data

  localStorage.setItem('timeSettings', JSON.stringify(timeSettings.value))
  settingsOpen.value = false
  resetTimer()
}

const { enabled: enableBreakScreen } = useDelayBlockScreen(showBreakScreen, 5000)
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
        <h2 class="text-8xl font-bold text-white mb-4 select-none tabular-nums">
          {{ formatTime(timer.break.timeLeft) }}
        </h2>
        <p class="text-2xl md:text-4xl text-white/90 font-bold mb-12">
          {{ breakMessage }}
        </p>
      </div>
      <button
        v-if="enableBreakScreen"
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
      <div v-if="settingsOpen">
        <!-- creat form to edit settings -->
        <SettingsComponent
          :time-settings="timeSettings"
          @close="settingsOpen = false"
          @update-time-settings="saveSettings"
        />
      </div>
      <div v-else>
        <div class="flex justify-end">
          <button
            role="button"
            class="flex justify-end py-4 gap-2 cursor-pointer hover:text-gray-400 transition-colors"
            @click="settingsOpen = true"
          >
            <Settings /> <span class="font-bold">Settings</span>
          </button>
        </div>
        <!-- Timer Display -->
        <div
          class="bg-white/70 dark:bg-card/70 backdrop-blur-lg rounded-3xl p-12 py-24 mb-6 relative overflow-hidden shadow-glow"
        >
          <!-- Progress Ring -->
          <div
            class="absolute inset-0 opacity-20 flex items-center justify-center"
            :class="{ 'animate-[spin_8s_linear_infinite]': timer.work.isRunning }"
          >
            <svg class="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="url(#gradient)"
                stroke-width="4"
                :stroke-dasharray="`${getProgress * 2.89} 289`"
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

          <div
            class="absolute inset-0 opacity-20 flex items-center justify-center"
            :class="{
              'animate-[spin_5s_ease-in-out_infinite]': timer.work.isRunning,
              hidden: !timer.work.isRunning && timer.work.timeLeft === timeSettings.work
            }"
          >
            <svg class="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                class="transition-all duration-1000 ease-linear"
                stroke-width="2"
                stroke="url(#gradient2)"
                :stroke-dasharray="`100 289`"
              />

              <defs>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="100%" stop-color="hsl(345, 100%, 70%)" />
                  <stop offset="0%" stop-color="hsl(270, 95%, 75%)" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div class="relative text-center z-10">
            <h2
              class="text-8xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4 select-none tabular-nums"
            >
              {{ formatTime(timer.work.timeLeft) }}
            </h2>
            <p class="text-slate-500 text-lg font-medium">focus time</p>
            <div class="flex gap-2 justify-center">
              <p class="text-sm text-slate-400 mt-2">completed: {{ pomodorosCompleted }}</p>
              <button
                title="Reset"
                class="bg-gradient-primary p-2 cursor-pointer hover:opacity-90 text-white size-8 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                @click="pomodorosCompleted = 0"
              >
                <RotateCcw />
              </button>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex gap-4 items-center justify-center">
          <button
            class="bg-gradient-primary cursor-pointer hover:opacity-90 text-white w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
            @click="
              () => {
                if (timer.work.isRunning) {
                  pauseTimer()
                } else {
                  timer.work.isRunning = true
                  startTimer()
                }
              }
            "
          >
            <Pause v-if="timer.work.isRunning" class="w-12 h-12" />
            <Play v-else class="w-12 h-12 ml-1" />
          </button>

          <button
            class="w-24 h-24 rounded-full border-2 border-slate-200 cursor-pointer bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-sm"
            @click="resetTimer"
          >
            <RotateCcw class="w-8 h-8" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
