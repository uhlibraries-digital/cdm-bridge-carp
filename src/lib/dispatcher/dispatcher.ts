import { AppStore } from '../stores'
import { Popup, Foldout, IField, IUpdateState } from '../app-state'
import { ExportType } from '../export';

export class Dispatcher {
  private readonly appStore: AppStore

  public constructor(appStore: AppStore) {
    this.appStore = appStore
  }

  public loadInitialState(): Promise<void> {
    return this.appStore.loadInitialState()
  }

  public showPopup(popup: Popup): Promise<void> {
    return this.appStore._showPopup(popup)
  }

  public closePopup(): Promise<void> {
    return this.appStore._closePopup()
  }

  public showFoldout(foldout: Foldout): Promise<void> {
    return this.appStore._showFoldout(foldout)
  }

  public closeFoldout(): Promise<void> {
    return this.appStore._closeFoldout()
  }

  public setPreferencesContentDm(hostname: string, port: string, ssl: boolean): Promise<void> {
    return this.appStore._setPreferencesContentDm(hostname, port, ssl)
  }

  public setPreferencesFields(fields: ReadonlyArray<IField>): Promise<void> {
    return this.appStore._setPreferencesFields(fields)
  }

  public setPreferencesMapUrl(url: string): Promise<void> {
    return this.appStore._setPreferencesMapUrl(url)
  }

  public setPreferencesArchivesSpace(
    endpoint: string,
    username: string,
    password: string
  ): Promise<void> {
    return this.appStore._setPreferencesArchivesSpace(
      endpoint,
      username,
      password
    )
  }

  public setPreferencesVocabulary(url: string): Promise<void> {
    return this.appStore._setPreferencesVocabulary(url)
  }

  public setCollectionFieldInfo(alias: string): Promise<void> {
    return this.appStore._setCollectionFieldInfo(alias)
  }

  public setAlias(alias: string): Promise<void> {
    return this.appStore._setAlias(alias)
  }

  public setCrosswalk(alias: string, field: IField, value: ReadonlyArray<string>): Promise<void> {
    return this.appStore._setCrosswalk(alias, field, value)
  }

  public setCrosswalkItemExport(alias: string, field: IField, value: boolean): Promise<void> {
    return this.appStore._setCrosswalkItemExport(alias, field, value)
  }

  public setArchivesSpaceResource(uri: string): Promise<void> {
    return this.appStore._setArchivesSpaceResource(uri)
  }

  public setAccessPath(path: string): Promise<void> {
    return this.appStore._setAccessPath(path)
  }

  public setPreservationPath(path: string): Promise<void> {
    return this.appStore._setPreservationPath(path)
  }

  public setModifiedMasterPath(path: string): Promise<void> {
    return this.appStore._setModifiedMasterPath(path)
  }

  public setRenameFiles(value: boolean): Promise<void> {
    return this.appStore._setRenameFiles(value)
  }

  public export(type: ExportType, download?: boolean): Promise<void> {
    return this.appStore._completeSaveInDesktop(type)
      .then(location => this.appStore._export(location, type, download))
      .catch((reason) => console.warn(reason))
  }

  public closeExport(): Promise<void> {
    return this.appStore._closeExport()
  }

  public presentError(error: Error): Promise<void> {
    return this.appStore._pushError(error)
  }

  public clearError(error: Error): Promise<void> {
    return this.appStore._clearError(error)
  }

  public setSidebarWidth(width: number): Promise<void> {
    return this.appStore._setSidebarWidth(width)
  }

  public resetSidebarWidth(): Promise<void> {
    return this.appStore._resetSidebarWidth()
  }

  public setUpdateState(state: IUpdateState): Promise<void> {
    return this.appStore._setUpdateState(state)
  }

  public setUpdateAvailableVisibility(visible: boolean): Promise<any> {
    return this.appStore._setUpdateAvailableVisibility(visible)
  }

  public updateNow() {
    return this.appStore._updateNow()
  }
}