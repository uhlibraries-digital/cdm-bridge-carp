import { app, Menu, ipcMain, shell } from 'electron'
import { AppWindow } from './app-window'
import { buildDefaultMenu, MenuEvent } from './menu'
import { updateStore } from './update-store'

let mainWindow: AppWindow | null = null
const __DEV__ = process.env.NODE_ENV === 'development'

// Increase default max memory size
app.commandLine.appendSwitch('js-flags', '--max_old_space_size=4096');

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
  }
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  createMainWindow()

  let menu = buildDefaultMenu()
  Menu.setApplicationMenu(menu)

  updateStore.onDidChange(state => {
    if (mainWindow) {
      mainWindow.sendUpdateState(state)
    }
  })
  updateStore.onError(error => {
    if (mainWindow) {
      mainWindow.sendUpdateError(error)
    }
  })
  if (!__DEV__) {
    updateStore.checkForUpdates()
  }

  ipcMain.on('menu-event', (event: Electron.IpcMainEvent, args: any[]) => {
    const { name }: { name: MenuEvent } = event as any
    if (mainWindow) {
      mainWindow.sendMenuEvent(name)
    }
  })

  ipcMain.on(
    'open-external',
    (event: Electron.IpcMainEvent, { path }: { path: string }) => {
      const result = shell.openExternal(path)
      event.sender.send('open-external-result', { result })
    }
  )

  ipcMain.on(
    'update-now',
    (event: Electron.IpcMainEvent, args: any[]) => {
      updateStore.quitAndInstallUpdate()
    }
  )

})

function createMainWindow() {
  const window = new AppWindow()

  window.onClose(() => {
    if (__DARWIN__) {
      app.quit()
    }
  })

  window.onDidLoad(() => {
    window.show()
  })
  window.load()

  mainWindow = window
}
