import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { SendIPCEvents } from '../shared/events'
import { match } from 'ts-pattern'

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    icon
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

  // if (process.platform === 'darwin') {
  //   app.dock?.setIcon(icon)
  // }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const browserWindow = createWindow()

  function handleIPCEvents(event: SendIPCEvents): void {
    match(event)
      .with('showOverlay', () => {
        ipcMain.on(event, () => {
          const primaryDisplay = screen.getPrimaryDisplay()
          const { width, height } = primaryDisplay.workAreaSize

          browserWindow.maximize()
          browserWindow.show()
          browserWindow.setAlwaysOnTop(true)
          browserWindow.setSkipTaskbar(true)
          browserWindow.setMenuBarVisibility(false)
          browserWindow.setFullScreen(true)
          browserWindow.setSize(width, height)
        })
      })
      .with('hideOverlay', () => {
        ipcMain.on(event, () => {
          browserWindow.setFullScreen(false)
          browserWindow.setSkipTaskbar(false)
          browserWindow.setMenuBarVisibility(true)
          browserWindow.setAlwaysOnTop(false)
          browserWindow.setSize(500, 800)
          browserWindow.center()
        })
      })
      .with('timer:start', () => {
        ipcMain.on(event, (_, seconds) => {
          startTimer(seconds)
        })
      })
      .with('timer:pause', () => {
        ipcMain.on(event, () => clearInterval(timerInterval))
      })
      .with('timer:reset', () => {
        ipcMain.on(event, () => {
          clearInterval(timerInterval)
        })
      })
      .otherwise(() => console.log('Unknown event'))
  }

  function initListeners() {
    handleIPCEvents('showOverlay')
    handleIPCEvents('hideOverlay')
    handleIPCEvents('timer:start')
    handleIPCEvents('timer:pause')
    handleIPCEvents('timer:reset')
  }

  // Timer State
  let timerInterval: NodeJS.Timeout | undefined = undefined
  let timeLeft = 0

  function startTimer(seconds: number) {
    clearInterval(timerInterval)
    timeLeft = seconds

    timerInterval = setInterval(() => {
      timeLeft -= 1

      // Send updates to renderer
      browserWindow.webContents.send('timer:tick', timeLeft)

      if (timeLeft <= 0) {
        clearInterval(timerInterval)
        browserWindow.webContents.send('timer:done')
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
