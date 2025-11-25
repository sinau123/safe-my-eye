import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ReceiveIPCEvents, SendIPCEvents } from '../shared/events'
import { match } from 'ts-pattern'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 500,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    icon,
    resizable: false
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // mainWindow.webContents.openDevTools()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const browserWindow = createWindow()

  function initListeners() {
    function handleIPCEvents(event: SendIPCEvents): void {
      match(event)
        .with('showOverlay', () => {
          ipcMain.on(event, async () => {
            const primaryDisplay = screen.getPrimaryDisplay()
            const { width, height } = primaryDisplay.workAreaSize

            if (browserWindow.isMinimized()) {
              browserWindow.maximize()
            }

            await sleep(200)

            browserWindow.setAlwaysOnTop(true, 'screen-saver')
            browserWindow.setSkipTaskbar(true)
            browserWindow.setMenuBarVisibility(false)
            browserWindow.setSize(width, height)
            browserWindow.setFullScreen(true)

            await sleep(200)
            browserWindow.setFullScreenable(false)
          })
        })
        .with('hideOverlay', () => {
          ipcMain.on(event, async () => {
            browserWindow.setFullScreenable(true)
            await sleep(200)

            browserWindow.setFullScreen(false)
            await sleep(200)

            browserWindow.setSize(500, 800)
            browserWindow.setSkipTaskbar(false)
            browserWindow.setAlwaysOnTop(false)
          })
        })
        .with('timer:start', () => {
          ipcMain.on(event, (_, seconds) => {
            startTimer(seconds)
          })
        })
        .with('timer:pause', () => {
          ipcMain.on(event, () => clearInterval(timer.work.timerInterval))
        })
        .with('timer:reset', () => {
          ipcMain.on(event, () => {
            clearInterval(timer.work.timerInterval)
          })
        })
        .with('timer-break:start', () => {
          ipcMain.on(event, (_, seconds) => {
            startBreakTimer(seconds)
          })
        })
        .with('timer-break:reset', () => {
          ipcMain.on(event, () => {
            clearInterval(timer.break.timerInterval)
          })
        })
        .otherwise(() => console.log('Unknown event'))
    }

    const events = [
      'showOverlay',
      'hideOverlay',
      'timer:start',
      'timer:pause',
      'timer:reset',
      'timer-break:start',
      'timer-break:reset'
    ] as SendIPCEvents[]

    events.forEach((event) => handleIPCEvents(event))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function sendIPCEvents(events: ReceiveIPCEvents, ...args: any[]) {
    browserWindow.webContents.send(events, ...args)
  }

  const timer: {
    work: {
      timerInterval: NodeJS.Timeout | undefined
      timeLeft: number
    }
    break: {
      timerInterval: NodeJS.Timeout | undefined
      timeLeft: number
    }
  } = {
    work: {
      timerInterval: undefined,
      timeLeft: 0
    },
    break: {
      timerInterval: undefined,
      timeLeft: 0
    }
  }

  function startTimer(seconds: number) {
    clearInterval(timer.work.timerInterval)
    timer.work.timeLeft = seconds

    timer.work.timerInterval = setInterval(() => {
      timer.work.timeLeft -= 1

      // Send updates to renderer
      sendIPCEvents('timer:tick', timer.work.timeLeft)

      if (timer.work.timeLeft <= 0) {
        clearInterval(timer.work.timerInterval)
        sendIPCEvents('timer:done')
      }
    }, 1000)
  }

  function startBreakTimer(seconds: number) {
    clearInterval(timer.break.timerInterval)
    timer.break.timeLeft = seconds

    timer.break.timerInterval = setInterval(() => {
      timer.break.timeLeft -= 1

      // Send updates to renderer
      sendIPCEvents('timer-break:tick', timer.break.timeLeft)

      if (timer.break.timeLeft <= 0) {
        clearInterval(timer.break.timerInterval)
        sendIPCEvents('timer-break:done')
      }
    }, 1000)
  }

  initListeners()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
