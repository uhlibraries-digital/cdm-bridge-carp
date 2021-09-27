import { CdmServer } from './contentdm'
import { IVocabulary } from './vocabulary'

export enum PopupType {
  Preferences,
  About
}

export enum ViewType {
  Collection,
  Export
}

export enum FoldoutType {
  Export
}

export type Popup =
  | { type: PopupType.Preferences }
  | { type: PopupType.About }
export type Foldout = { type: FoldoutType.Export }

export interface IAppState {
  readonly preferences: any
  readonly currentPopup: Popup | null
  readonly currentFoldout: Foldout | null
  readonly collections: any | null
  readonly collectionFieldInfo: any | null
  readonly crosswalk: any | null
  readonly selectedAlias: string
  readonly selectedView: ViewType | null
  readonly exportProgress: IExportProgress
  readonly exportError: ReadonlyArray<IExportError>
  readonly exportDone: boolean
  readonly errors: ReadonlyArray<Error>
  readonly sidebarWidth: number
  readonly defaultFields: ReadonlyArray<IField>
  readonly archivesSpaceResources: ReadonlyArray<any>
  readonly selectedArchivesSpaceResource: string
  readonly isUpdateAvailable: boolean
  readonly updateState: IUpdateState | null
  readonly accessPath: string
  readonly preservationPath: string
  readonly modifiedMasterPath: string
  readonly renameFiles: boolean
  readonly vocabulary: ReadonlyArray<IVocabulary>
  readonly loadingVocabulary: boolean
}

export interface IArchivesSpace {
  apiEndpoint: string
  username: string
}

export interface IExportProgress {
  readonly value: number | undefined
  readonly description?: string
  readonly subdescription?: string
}

export interface IVocabularyUrl {
  url: string
}

export interface IPreferences {
  aspace: IArchivesSpace
  cdm: CdmServer
  fields: ReadonlyArray<IField>
  mapUrl: string
  vocabulary: IVocabularyUrl
}

export interface IField {
  id: string
  name: string
  required: boolean
}

export interface ICrosswalkField {
  nicks: ReadonlyArray<string>
  itemExport: boolean
}

export interface ICrosswalkFieldHash {
  [key: string]: ICrosswalkField
}

export interface ICrosswalk {
  [key: string]: ICrosswalkFieldHash
}

export interface IExportError {
  readonly description: string
}

export enum UpdateStatus {
  Checking,
  UpdateAvailable,
  UpdateNotAvailable,
  UpdateReady
}

export interface IUpdateState {
  status: UpdateStatus
  lastCheck: Date | null
}