import {
  IAppState,
  Popup,
  PopupType,
  Foldout,
  ViewType,
  IExportProgress,
  IPreferences,
  IField,
  ICrosswalk,
  ICrosswalkFieldHash,
  IExportError,
  ICrosswalkField,
  IUpdateState
} from '../app-state'
import { TypedBaseStore } from './base-store'
import { TokenStore } from './token-store'
import {
  ContentDm,
  CdmType,
  CdmServer,
  CdmCollection,
  CdmFieldInfo
} from '../contentdm'
import { electronStore } from './electron-store'
import { ArchivesSpace, IResource, ArchivesSpaceServer } from '../archivesspace'
import { Exporter, ExportType } from '../export'
import { BcdamsMap, BcdamsMapField } from '../map'
import { remote, ipcRenderer } from 'electron'
import { ArchivesSpaceStore, IArchivesSpaceStoreState } from './archives-space-store'


const defaultSidebarWidth: number = 200

const defaultFields: ReadonlyArray<IField> = []

const defaultPreferences: IPreferences = {
  aspace: {
    apiEndpoint: '',
    username: ''
  },
  cdm: {
    hostname: '',
    port: null,
    ssl: false
  },
  fields: defaultFields,
  mapUrl: ''
}

export class AppStore extends TypedBaseStore<IAppState> {

  private emitQueued = false

  private preferences: IPreferences = defaultPreferences
  private currentPopup: Popup | null = null
  private currentFoldout: Foldout | null = null
  private collections: Array<CdmCollection> | null = null
  private collectionFieldInfo: Array<CdmFieldInfo> | null = null
  private contentdmServer: CdmServer | null = null
  private crosswalk: ICrosswalk = {}
  private selectedAlias: string = ''
  private selectedView: ViewType | null = null
  private exportProgress: IExportProgress = { value: undefined }
  private exportError: ReadonlyArray<IExportError> = new Array<IExportError>()
  private exportDone: boolean = false
  private errors: ReadonlyArray<Error> = new Array<Error>()
  private sidebarWidth: number = defaultSidebarWidth
  private defaultFields: ReadonlyArray<IField> = defaultFields
  private archivesSpaceServer: ArchivesSpaceServer | null = null
  private archivesSpaceResources: ReadonlyArray<any> = []
  private selectedArchivesSpaceResource: string = ''
  private isUpdateAvailable: boolean = false
  private updateState: IUpdateState | null = null
  private accessPath: string = ''
  private preservationPath: string = ''
  private modifiedMasterPath: string = ''

  private readonly archivesSpaceStore: ArchivesSpaceStore

  public constructor(
    archivesSpaceStore: ArchivesSpaceStore
  ) {
    super()

    this.archivesSpaceStore = archivesSpaceStore

    this.wireupStoreEventHandlers()
  }

  private wireupStoreEventHandlers() {
    this.archivesSpaceStore.onDidUpdate((data) => {
      this.onArchivesSpaceStoreUpdated(data)
    })
  }

  protected emitUpdate() {
    if (this.emitQueued) {
      return
    }
    this.emitQueued = true
    this.emitUpdateNow()
  }

  private emitUpdateNow() {
    this.emitQueued = false
    const state = this.getState()
    super.emitUpdate(state)
  }

  public async loadInitialState() {
    this.selectedView = ViewType.Collection

    this.preferences = JSON.parse(
      String(electronStore.get('preferences', 'null'))
    ) as IPreferences

    this.collections = []

    this.crosswalk = this._convertCrosswalk(JSON.parse(
      String(electronStore.get('crosswalk', 'null'))
    ) as ICrosswalk)

    if (!this.preferences) {
      this.preferences = defaultPreferences
      this._showPopup({ type: PopupType.Preferences })
    }
    else {
      this._setContentDmServer()
      this._setCollections()
      this._setMapFields()
      await this._setArchivesSpaceServer()
      this._setArchivesSpaceResources()
    }

    this.sidebarWidth = parseInt(
      String(electronStore.get('sidebarWidth')), 10
    ) || defaultSidebarWidth

    this.emitUpdateNow()
  }

  public getState(): IAppState {
    return {
      preferences: this.preferences,
      currentPopup: this.currentPopup,
      currentFoldout: this.currentFoldout,
      collections: this.collections,
      collectionFieldInfo: this.collectionFieldInfo,
      crosswalk: this.crosswalk,
      selectedAlias: this.selectedAlias,
      selectedView: this.selectedView,
      exportProgress: this.exportProgress,
      exportError: this.exportError,
      exportDone: this.exportDone,
      errors: this.errors,
      sidebarWidth: this.sidebarWidth,
      defaultFields: this.defaultFields,
      archivesSpaceResources: this.archivesSpaceResources,
      selectedArchivesSpaceResource: this.selectedArchivesSpaceResource,
      isUpdateAvailable: this.isUpdateAvailable,
      updateState: this.updateState,
      accessPath: this.accessPath,
      preservationPath: this.preservationPath,
      modifiedMasterPath: this.modifiedMasterPath
    }
  }

  public async _showPopup(popup: Popup): Promise<void> {
    this._closePopup()

    this.currentPopup = popup
    this.emitUpdate()
  }

  public _closePopup(): Promise<any> {
    this.currentPopup = null
    this.emitUpdate()

    return Promise.resolve()
  }

  public async _showFoldout(foldout: Foldout): Promise<void> {
    this.currentFoldout = foldout
    this.emitUpdate()
  }

  public async _closeFoldout(): Promise<void> {
    if (this.currentFoldout == null) {
      return
    }
    this.currentFoldout = null
    this.emitUpdate()
  }

  public _setSidebarWidth(width: number): Promise<void> {
    this.sidebarWidth = width
    electronStore.set('sidebarWidth', width.toString())
    this.emitUpdate()

    return Promise.resolve()
  }

  public _resetSidebarWidth(): Promise<void> {
    this.sidebarWidth = defaultSidebarWidth
    electronStore.delete('sidebarWidth')
    this.emitUpdate()

    return Promise.resolve()
  }

  public async _setAlias(alias: string): Promise<void> {
    this.selectedAlias = alias
    this.emitUpdate()
  }

  public _setCrosswalk(
    alias: string,
    field: IField,
    value: ReadonlyArray<string>
  ): Promise<void> {
    if (!this.crosswalk) {
      this.crosswalk = {}
    }

    if (!this.crosswalk[alias]) {
      this.crosswalk[alias] = this._crosswalkDefault()
    }
    if (!this.crosswalk[alias][field.id]) {
      this.crosswalk[alias][field.id] = this._crosswalkDefaultField()
    }
    this.crosswalk[alias][field.id].nicks = value

    electronStore.set('crosswalk', JSON.stringify(this.crosswalk))
    this.emitUpdate()

    return Promise.resolve()
  }

  public async _removeCrosswalkField(alias: string, field: IField): Promise<void> {
    if (!this.crosswalk || !this.crosswalk[alias]) {
      return
    }

    delete this.crosswalk[alias][field.id]
    electronStore.set('crosswalk', JSON.stringify(this.crosswalk))
    this.emitUpdate()

    return Promise.resolve()
  }

  public async _setCrosswalkItemExport(
    alias: string,
    field: IField,
    value: boolean
  ): Promise<void> {
    if (!this.crosswalk) {
      this.crosswalk = {}
    }

    if (!this.crosswalk[alias]) {
      this.crosswalk[alias] = this._crosswalkDefault()
    }
    if (!this.crosswalk[alias][field.id]) {
      this.crosswalk[alias][field.id] = this._crosswalkDefaultField()
    }
    this.crosswalk[alias][field.id].itemExport = value

    electronStore.set('crosswalk', JSON.stringify(this.crosswalk))
    this.emitUpdate()

    return Promise.resolve()
  }

  public _setPreferencesMapUrl(
    url: string
  ): Promise<any> {
    this.preferences.mapUrl = url
    electronStore.set('preferences', JSON.stringify(this.preferences))

    this._setMapFields()

    return Promise.resolve()
  }

  public _setPreferencesContentDm(
    hostname: string,
    port: string,
    ssl: boolean
  ): Promise<any> {
    if (port === '') {
      port = ssl ? '443' : '80'
    }

    this.preferences.cdm.hostname = hostname
    this.preferences.cdm.port = Number(port)
    this.preferences.cdm.ssl = ssl
    electronStore.set('preferences', JSON.stringify(this.preferences))

    this.collectionFieldInfo = null
    this.selectedAlias = ''

    this._setContentDmServer()
    this._setCollections()

    return Promise.resolve()
  }

  public async _setPreferencesArchivesSpace(
    endpoint: string,
    username: string,
    password: string
  ): Promise<any> {

    this.preferences.aspace.apiEndpoint = endpoint
    this.preferences.aspace.username = username

    const currentState = this.archivesSpaceStore.getState()
    this.archivesSpaceStore.setState({
      ...currentState,
      endpoint: endpoint,
      username: username,
      password: password
    })

    electronStore.set('preferences', JSON.stringify(this.preferences))
    this.emitUpdate()

    await this._setArchivesSpaceServer()
    this._setArchivesSpaceResources()

    return Promise.resolve()
  }

  public _setPreferencesFields(fields: ReadonlyArray<IField>): Promise<any> {
    const removedFields = this.preferences.fields.filter((field) => {
      return fields.findIndex(f => f.id === field.id) === -1
    })

    removedFields.map((field) => {
      for (let alias in this.crosswalk) {
        this._removeCrosswalkField(alias, field)
      }
    })

    this.preferences.fields = Array.from(fields)
    electronStore.set('preferences', JSON.stringify(this.preferences))

    return Promise.resolve()
  }

  private async _setContentDmServer(): Promise<void> {
    this.contentdmServer = {
      hostname: this.preferences.cdm.hostname,
      port: this.preferences.cdm.port,
      ssl: this.preferences.cdm.ssl
    }
  }

  public _setCollectionFieldInfo(alias: string): Promise<any> {
    this.selectedAlias = alias
    const cdm = new ContentDm(this.contentdmServer)

    return cdm.collectionFieldInfo(alias)
      .then(data => this.collectionFieldInfo = data)
      .catch(() => this.collectionFieldInfo = null)
      .then(() => this.emitUpdate())
  }

  private async _setCollections(): Promise<void> {
    const cdm = new ContentDm(this.contentdmServer)

    return cdm.collections(CdmType.Unpublished)
      .then((data) => {
        if (typeof data === 'string') {
          const regex = /<body[^>]*>((.|[\n\r])*)<\/body>/im
          const body = regex.exec(data)
          if (body) {
            data = body[1].trim()
          }
          throw new Error(data)
        }
        this.collections = data
      })
      .catch((error) => {
        this.collections = null
        this._pushError(
          new Error("Unable to get collection information. Please make sure you have the correct CONTENTdm API information in Preferences.")
        )
        return
      })
      .then(() => this.emitUpdate())
  }

  private async _setMapFields() {
    const url = this.preferences.mapUrl
    const map = new BcdamsMap(url)

    return map.fields()
      .then((mapFields) => {
        const fields: Array<IField> = mapFields.map((f: BcdamsMapField) => {
          return {
            id: `${f.namespace}.${f.name}`,
            name: f.label,
            required: false
          }
        })
        this._setPreferencesFields(fields)
      })
  }

  private async _setArchivesSpaceServer(): Promise<any> {
    const password = await this.getArchivesSpacePassword(this.preferences.aspace.username)
    this.archivesSpaceServer = {
      endpoint: this.preferences.aspace.apiEndpoint,
      username: this.preferences.aspace.username,
      password: password
    }
  }

  private async _setArchivesSpaceResources(): Promise<any> {
    if (!this.archivesSpaceServer) {
      return []
    }
    const aspace = new ArchivesSpace(this.archivesSpaceServer)
    return aspace.getResources('/repositories/2/search')
      .then((resources) => {
        this.archivesSpaceResources = resources.sort((a: IResource, b: IResource) => {
          return a.title.localeCompare(b.title)
        })
        this.emitUpdate()
      })
      .catch((err) => {
        this._pushError(err)
      })
  }

  public async _setArchivesSpaceResource(uri: string): Promise<any> {
    this.selectedArchivesSpaceResource = uri
    this.emitUpdate()
    return Promise.resolve()
  }

  public async _setAccessPath(path: string): Promise<any> {
    this.accessPath = path
    this.emitUpdate()
    return Promise.resolve
  }

  public async _setPreservationPath(path: string): Promise<any> {
    this.preservationPath = path
    this.emitUpdate()
    return Promise.resolve()
  }

  public async _setModifiedMasterPath(path: string): Promise<any> {
    this.modifiedMasterPath = path
    this.emitUpdate()
    return Promise.resolve()
  }

  public _pushError(error: Error): Promise<void> {
    const newErrors = Array.from(this.errors)
    newErrors.push(error)
    this.errors = newErrors
    this.emitUpdate()

    return Promise.resolve()
  }

  public _clearError(error: Error): Promise<void> {
    this.errors = this.errors.filter(e => e !== error)
    this.emitUpdate()

    return Promise.resolve()
  }

  public async _export(location: string, type: ExportType, download?: boolean): Promise<void> {
    const exporter = new Exporter(this.contentdmServer, this.archivesSpaceServer)
    this.selectedView = ViewType.Export
    this.exportError = []
    this.exportDone = false
    this.emitUpdate()

    const collection: CdmCollection | null | undefined = this.collections
      ? this.collections.find(coll => coll.alias === this.selectedAlias) : null
    const collectionName = collection ? collection.name : ''

    const pwrid = remote.powerSaveBlocker.start('prevent-app-suspension');

    exporter.export(
      this.selectedAlias,
      location,
      download || false,
      this.preferences.fields,
      this.crosswalk[this.selectedAlias],
      type,
      this.selectedArchivesSpaceResource,
      collectionName,
      this.accessPath,
      this.preservationPath,
      this.modifiedMasterPath,
      (progress) => {
        this.exportProgress = progress
        this.emitUpdate()
      },
      (error) => {
        console.error(error)
        const exportErrors = Array.from(this.exportError)
        exportErrors.push(error)
        this.exportError = exportErrors
        this.emitUpdate()
      }
    )
      .then(() => {
        this.exportDone = true
        this.emitUpdate()
      })
      .catch((err) => {
        console.error(err)
        this._closeExport()
        this._pushError(err)
      })
      .then(() => {
        remote.powerSaveBlocker.stop(pwrid)
      })


    return Promise.resolve()
  }

  public async _closeExport() {
    this.selectedView = ViewType.Collection
    this.emitUpdate()
  }

  public async _completeSaveInDesktop(type: ExportType): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.selectedAlias) {
        reject('No collection selected')
        return
      }

      if (type === ExportType.Metadata) {
        var filters = [
          {
            name: "CSV",
            extensions: ["csv"]
          }
        ]
      }
      else {
        filters = [
          {
            name: "Carpenters Project",
            extensions: ["carp"]
          }
        ]
      }

      const url = remote.dialog.showSaveDialog({
        title: "Export Collection",
        buttonLabel: "Export",
        filters: filters
      })
      if (url) {
        resolve(url)
        return
      }
      reject('No export location set')
    })
  }

  private _convertCrosswalk(crosswalk: ICrosswalk): ICrosswalk {
    let newCrosswalk: ICrosswalk = {}
    for (let alias in crosswalk) {
      newCrosswalk[alias] = {}
      for (let f in crosswalk[alias]) {
        newCrosswalk[alias][f] = this._checkCrosswalkFields(crosswalk[alias][f])
      }
    }

    return newCrosswalk
  }

  private _checkCrosswalkFields(field: ICrosswalkField): ICrosswalkField {
    if (field.nicks === undefined) {
      return {
        nicks: [""],
        itemExport: false
      }
    }

    return field
  }

  private _crosswalkDefault(): ICrosswalkFieldHash {
    let cw: ICrosswalkFieldHash = {}
    this.preferences.fields.map((f: IField) => {
      return cw[f.id] = this._crosswalkDefaultField()
    })

    return cw
  }

  private _crosswalkDefaultField(): ICrosswalkField {
    return {
      nicks: [""],
      itemExport: false
    }
  }

  private onArchivesSpaceStoreUpdated(data: IArchivesSpaceStoreState | null) {
    if (!data) {
      return
    }

    // TODO: Get archivesspace data
  }

  private async getArchivesSpacePassword(username: string): Promise<any> {
    try {
      const password = await TokenStore.getItem('cdmbridge2carp/archivesspace', username) || ''
      return password
    }
    catch (e) { }
  }

  public _setUpdateAvailableVisibility(visable: boolean): Promise<any> {
    this.isUpdateAvailable = visable
    this.emitUpdate()

    return Promise.resolve()
  }

  public _updateNow() {
    ipcRenderer.send('update-now')
  }

  public _setUpdateState(state: IUpdateState): Promise<any> {
    this.updateState = state
    this.emitUpdate()

    return Promise.resolve()
  }

}