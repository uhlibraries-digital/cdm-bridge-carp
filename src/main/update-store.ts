import { Emitter, Disposable } from 'event-kit'
import { autoUpdater } from 'electron-updater'
import { UpdateStatus, IUpdateState } from '../lib/app-state'
import { electronStore } from '../lib/stores/electron-store'

const lastSuccessfulCheckKey = 'last-successful-update-check'

class UpdateStore {
  private emitter = new Emitter()
  private status = UpdateStatus.UpdateNotAvailable
  private lastChecked: Date | null = null

  public constructor() {
    const lastSuccessfulCheck = String(electronStore.get(lastSuccessfulCheckKey))
    if (lastSuccessfulCheck) {
      const checkTime = parseInt(lastSuccessfulCheck, 10)
      if (!isNaN(checkTime)) {
        this.lastChecked = new Date(checkTime)
      }
    }

    autoUpdater.on('error', this.onAutoUpdaterError)
    autoUpdater.on('update-available', this.onUpdateAvailable)
    autoUpdater.on('update-not-available', this.onUpdateNotAvailable)
    autoUpdater.on('update-downloaded', this.onUpdateDownloaded)
    autoUpdater.on('checking-for-update', this.onCheckingForUpdate)
  }

  private updateLastChecked() {
    const now = new Date()
    const timeString = now.getTime().toString()

    this.lastChecked = now
    electronStore.set(lastSuccessfulCheckKey, timeString)
  }

  private onAutoUpdaterError = (error: Error) => {
    this.status = UpdateStatus.UpdateNotAvailable
    this.emitError(error)
  }

  private onUpdateAvailable = () => {
    this.updateLastChecked()
    this.status = UpdateStatus.UpdateAvailable
    this.emitDidChange()
  }

  private onUpdateDownloaded = () => {
    this.status = UpdateStatus.UpdateReady
    this.emitDidChange()
  }

  private onCheckingForUpdate = () => {
    this.status = UpdateStatus.Checking
    this.emitDidChange()
  }

  private onUpdateNotAvailable = () => {
    this.updateLastChecked()
    this.status = UpdateStatus.UpdateNotAvailable
    this.emitDidChange()
  }

  public onDidChange(fn: (state: IUpdateState) => void): Disposable {
    return this.emitter.on('did-change', fn)
  }

  public onError(fn: (error: Error) => void): Disposable {
    return this.emitter.on('error', fn)
  }

  private emitDidChange() {
    this.emitter.emit('did-change', this.state)
  }

  private emitError(error: Error) {
    this.emitter.emit('error', error)
  }

  public get state(): IUpdateState {
    return {
      status: this.status,
      lastCheck: this.lastChecked
    }
  }

  public checkForUpdates() {
    autoUpdater.checkForUpdates()
  }

  public quitAndInstallUpdate() {
    autoUpdater.quitAndInstall()
  }
}

export const updateStore = new UpdateStore()