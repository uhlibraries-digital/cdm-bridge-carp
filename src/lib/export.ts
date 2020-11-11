import { ContentDm, CdmServer } from './contentdm'
import {
  IExportProgress,
  IExportError,
  IField,
  ICrosswalkFieldHash
} from './app-state'
import { csvString } from './csv'
import {
  writeFile,
  createWriteStream,
  WriteStream,
  readdirSync,
  accessSync,
  constants
} from 'fs'
import { basename, dirname, parse } from 'path'
import { sync } from 'mkdirp'
import { v4 } from 'uuid'
import {
  IProject,
  ProjectType,
  IContainer,
  createContainerFilesystem,
  containerToPath,
  filePostfix,
  FilePurpose,
  copyFileToProject,
  createDirectories,
  IFile,
  ProcessingType
} from './carpenters'
import {
  ArchivesSpace,
  ArchivesSpaceServer
} from './archivesspace'
import { padLeft } from './string'
import * as filesize from 'filesize'

const __DEV__ = process.env.NODE_ENV === 'development'

export enum ExportType {
  Carp,
  Metadata
}

export interface IFileProgress {
  readonly description: string
}

export interface ISourceFile {
  readonly filename: string
  readonly name: string
  readonly ext: string
}

export class Exporter {
  private exportAlias: string = ''
  private exportCrosswalk: any | null = null
  private cdm: ContentDm
  private aspace: ArchivesSpace
  private exportLocation: string = ''
  private collectionFieldInfo: any = null
  private accessPath: string = ''
  private preservationPath: string = ''
  private modifiedMasterPath: string = ''

  public constructor(public cdmServer: CdmServer | null, public aspaceServer: ArchivesSpaceServer | null) {
    this.cdm = new ContentDm(this.cdmServer)
    this.aspace = new ArchivesSpace(this.aspaceServer)
  }

  public async export(
    alias: string,
    location: string,
    download: boolean,
    fields: ReadonlyArray<IField>,
    crosswalk: ICrosswalkFieldHash,
    type: ExportType,
    resource: string,
    collectionName: string,
    accessPath: string,
    preservationPath: string,
    modifiedMasterPath: string,
    progressCallback: (progress: IExportProgress) => void,
    errorCallback: (error: IExportError) => void,
  ): Promise<void> {

    const errors: Array<IExportError> = []
    this.exportAlias = alias
    this.exportCrosswalk = crosswalk
    this.accessPath = accessPath
    this.preservationPath = preservationPath
    this.modifiedMasterPath = modifiedMasterPath

    const missing = this._missingFields(fields, crosswalk)
    if (missing) {
      return Promise.reject(
        new Error(missing.toString().replace(/,/gi, "\n"))
      )
    }

    progressCallback({ value: undefined, description: 'Getting item records' })

    this.collectionFieldInfo = await this.cdm.collectionFieldInfo(alias)

    location = download ? this.downloadLocation(location) : location
    this.exportLocation = dirname(location)
    const data = await this.records(alias)


    const exportStream = createWriteStream(location)
    await this._processRecords(
      type,
      data.records,
      fields,
      exportStream,
      resource,
      collectionName,
      progressCallback,
      (error: IExportError) => {
        errors.push(error)
        errorCallback(error)
      }
    )
    exportStream.end()

    if (errors.length > 0) {
      this.processErrors(errors, location)
    }

    progressCallback({
      value: 1,
      description: `Exported ${data.records.length} items`,
      subdescription: ''
    })
  }

  private async records(
    alias: string,
    start: number = 1,
    prevData?: any
  ): Promise<any> {
    alias = alias.replace('/', '')
    const s = String(start)

    return this.cdm._request(
      'dmQuery',
      [alias, '0', '0', 'filetype', '1024', s, '0', '0', '0', '0', '1', '0']
    )
      .then((data) => {
        if (prevData) {
          data.records = data.records.concat(prevData.records)
        }
        if (data.pager.total >= start + 1024) {
          return this.records(alias, start + 1025, data)
        }
        else {
          return data
        }
      })
  }

  private async getRecord(
    record: any,
    compoundProgressCallback?: (item: number, total: number) => void
  ): Promise<any> {
    const item = await this.cdm.item(this.exportAlias, record.pointer)
    const fileFieldInfo = this.collectionFieldInfo.find((f: any) => f.name === "File Name")
    const fileNick = fileFieldInfo ? fileFieldInfo.nick : null

    if (record.filetype === 'cpd') {
      const object = await this.cdm.compoundObject(
        this.exportAlias,
        record.pointer
      )
      const pages = this._pages(object)

      item.files = []
      let count = 0
      for (let page of pages) {
        if (compoundProgressCallback) {
          compoundProgressCallback(++count, pages.length)
        }
        const pageInfo = await this.cdm.item(this.exportAlias, page.pageptr)
        const filename = typeof pageInfo[fileNick] === 'string' ? pageInfo[fileNick] : ''
        item.files.push({
          filename: page.pagefile,
          accessFilename: filename,
          alias: this.exportAlias,
          pointer: page.pageptr,
          size: pageInfo.cdmfilesize,
          info: pageInfo
        })
      }
    }
    else {
      const filename = typeof item[fileNick] === 'string' ? item[fileNick] : ''
      item.files = [{
        filename: record.find,
        accessFilename: filename,
        alias: this.exportAlias,
        pointer: record.pointer,
        size: item.cdmfilesize,
        info: null
      }]
    }

    return item
  }

  private _pages(object: any): ReadonlyArray<any> {
    let pages: Array<any> = new Array()

    if (object.node && object.node.node) {
      const nodes = this._toArray(object.node.node)
      nodes.map((node: any) => {
        pages = pages.concat(this._toArray(node.page))
      })
    }
    const otherPages = object.page || object.node.page || []

    return pages.concat(this._toArray(otherPages))
  }

  private _toArray(obj: any): Array<any> {
    if (!obj) {
      return []
    }
    return Array.isArray(obj) ? obj : [obj]
  }

  private _map(
    item: any,
    fields: ReadonlyArray<IField>,
    errorCallback?: (error: IExportError) => void,
    itemLevel?: boolean
  ): any {

    if (!item) {
      return []
    }

    let mapItem: any = {
      values: [],
      fieldValues: {},
      files: item.files
    }
    for (let field of fields) {
      const nicks = this.exportCrosswalk[field.id] ?
        this.exportCrosswalk[field.id].nicks.filter((nick: string) => nick !== '') :
        []
      const exportItem = this.exportCrosswalk[field.id] ?
        this.exportCrosswalk[field.id].itemExport : false

      let value = ''
      if (itemLevel && !exportItem) {
        value = ''
      }
      else {
        nicks.map((nick: string) => {
          value += (typeof item[nick] === 'string') ? item[nick].replace(/;+$/g, '') + "; " : ""
        })
        value = value.slice(0, -2)
      }

      if (errorCallback && field.required && value === "") {
        errorCallback({
          description: `Item ${item['dmrecord']} '${item['title']}' is missing data for required field '${field.name}'`
        })
      }

      mapItem.values.push(value)
      mapItem.fieldValues[field.id] = value
    }
    return mapItem
  }

  private async _processRecords(
    type: ExportType,
    records: any,
    fields: ReadonlyArray<IField>,
    exportStream: WriteStream,
    resource: string,
    collectionName: string,
    progressCallback: (progress: IExportProgress) => void,
    errorCallback: (error: IExportError) => void
  ): Promise<any> {

    let count = 0
    let items: Array<any> = []
    let csvItems: Array<any> = [fields.map((key) => {
      return key.name
    })]

    for (let record of records) {
      const progressValue = type === ExportType.Metadata ?
        (count / records.length) : (count / (records.length * 2))
      progressCallback({
        value: progressValue,
        description: `Mapping item ${++count} of ${records.length}`
      })

      const item = await this.getRecord(record, (cpo, cpototal) => {
        if (cpototal > 30) { // threshold so the display doesn't get to crazy
          progressCallback({
            value: progressValue,
            description: `Mapping item ${count} of ${records.length}`,
            subdescription: `Getting compound object item record ${cpo} of ${cpototal}`
          })
        }
      })
      const mapItem = this._map(item, fields, errorCallback)
      items.push(mapItem)

      if (type === ExportType.Metadata) {
        csvItems.push(mapItem.values)
        const csvData = await csvString(csvItems)
        await exportStream.write(csvData)
        csvItems = []
      }

      if (__DEV__) {
        console.log(`heapTotal: ${Math.round(process.memoryUsage().heapTotal / 1e6)}MB, heapUsed: ${Math.round(process.memoryUsage().heapUsed / 1e6)}MB`)
      }
    }

    if (type === ExportType.Carp) {
      const project = await this._processCarpentersProject(
        resource,
        collectionName,
        items,
        progressCallback,
        errorCallback
      )
      progressCallback({
        value: undefined,
        description: 'Creating project directories'
      })
      await createContainerFilesystem(this.exportLocation, project.objects)
      await exportStream.write(JSON.stringify(project))
    }

  }

  private async _processCarpentersProject(
    resource: string,
    collectionName: string,
    items: any,
    progressCallback: (progress: IExportProgress) => void,
    errorCallback: (error: IExportError) => void
  ): Promise<any> {

    const projectType = resource === '' ? ProjectType.NonArchival : ProjectType.Archival
    let project: IProject = {
      type: projectType,
      resource: resource,
      collectionTitle: collectionName,
      collectionArkUrl: '',
      aic: '',
      objects: []
    }

    let index = 0
    let cdmFiles: Array<ISourceFile> = []
    for (let item of items) {
      index++
      const processValue = ((index + items.length) / (items.length * 2))
      progressCallback({
        value: processValue,
        description: `Creating object ${index} of ${items.length}`,
        subdescription: 'Getting container information'
      })

      const aspaceUri = (('uhlib.aSpaceUri' in item.fieldValues) && item.fieldValues['uhlib.aSpaceUri'] !== '')
        ? item.fieldValues['uhlib.aSpaceUri'] : ''

      const archivalobject = await this.aspace.getArchivalObject(aspaceUri)
        .catch((err) => {
          const error = new Error(
            `"${item.fieldValues['dcterms.title']}" has a invalid ArchivesSpace uri ${aspaceUri} please check the URI\n` +
            `${err}`
          )
          return Promise.reject(error)
        })

      if (archivalobject && resource !== archivalobject['resource']['ref']) {
        errorCallback({
          description: `"${item.fieldValues['dcterms.title']}" doesn't match expected ArchivesSpace collection uri ${resource}`
        })
        continue
      }

      const container = await this._createContainer(projectType, index, archivalobject)
      const containers = container ? [container] : []

      const files = await this._processCarpentersFiles(
        item.files,
        index,
        container,
        (fileProgress) => {
          progressCallback({
            value: processValue,
            description: `Creating object ${index} of ${items.length}`,
            subdescription: fileProgress.description
          })
        },
        errorCallback
      )

      const cdmFilenames = this.getCdmFilenames(item.files)
      cdmFiles = cdmFilenames ? cdmFiles.concat(cdmFilenames) : cdmFiles

      let processingType = ProcessingType.Unknown
      let productionNotes = ''
      if ('dcterms.type' in item.fieldValues) {
        processingType = this.processingType(item.fieldValues['dcterms.type'])
        productionNotes = this.processingTypeNotes(item.fieldValues['dcterms.type'])
        item.fieldValues['dcterms.type'] = this.fixMultipleTypeFieldValues(item.fieldValues['dcterms.type'])
      }

      const objects = Array.from(project.objects)
      objects.push(
        {
          uuid: v4(),
          processing_type: processingType,
          title: item.fieldValues['dcterms.title'],
          dates: [],
          containers: containers,
          level: 'item',
          artificial: projectType === ProjectType.Archival,
          parent_uri: aspaceUri,
          uri: null,
          productionNotes: productionNotes,
          do_ark: '',
          pm_ark: '',
          metadata: item.fieldValues,
          files: files
        }
      )
      project.objects = objects
    }

    this.reportMissedFiles(cdmFiles)

    return project
  }

  private async _createContainer(projectType: ProjectType, index: number, archivalobject: any): Promise<any> {
    if (projectType === ProjectType.NonArchival) {
      return {
        top_container: null,
        type_1: 'Item',
        indicator_1: index,
        type_2: null,
        indicator_2: null,
        type_3: null,
        indicator_3: null
      }
    }
    if (!archivalobject) return null

    const containers = archivalobject.instances.filter((i: any) => {
      return i.sub_container && i.sub_container.top_container
    })
    if (containers.length === 0) {
      return {
        top_container: null,
        type_1: 'Item',
        indicator_1: index,
        type_2: null,
        indicator_2: null,
        type_3: null,
        indicator_3: null
      }
    }

    const container = containers[0].sub_container
    const top_container = await this.aspace.getTopContainer(container.top_container.ref)
    const objectContainer: IContainer = {
      top_container: container.top_container.ref,
      type_1: top_container.type,
      indicator_1: top_container.indicator,
      type_2: container.type_2,
      indicator_2: container.indicator_2,
      type_3: container.type_3,
      indicator_3: container.indicator_3
    }

    return this.addContainer(objectContainer, index)
  }

  private async _processCarpentersFiles(
    files: ReadonlyArray<any>,
    objectIndex: number,
    container: IContainer,
    fileCopyProgressCallback: (fileProgress: IFileProgress) => void,
    errorCallback: (error: IExportError) => void
  ): Promise<any> {
    if (files.length === 0) {
      return []
    }

    const itemFilenames = this.getCdmFilenames(files)
    const accessFilenames = this.getFilenames(this.accessPath)
    const preservationFilenames = this.getFilenames(this.preservationPath)
    const modifiedMasterFilenames = this.getFilenames(this.modifiedMasterPath)

    if (!itemFilenames) return []

    let index = 0
    let carpentersFiles: Array<IFile> = []
    for (let orgFilename of itemFilenames) {
      index++
      const containerPath = containerToPath(container)
      if (accessFilenames) {
        const file: IFile | null = await this._copyFiles(
          orgFilename,
          accessFilenames,
          containerPath,
          this.accessPath,
          objectIndex,
          index,
          FilePurpose.Access,
          fileCopyProgressCallback,
          errorCallback
        )
        if (file) { carpentersFiles.push(file) }
      }
      if (preservationFilenames) {
        const file: IFile | null = await this._copyFiles(
          orgFilename,
          preservationFilenames,
          containerPath,
          this.preservationPath,
          objectIndex,
          index,
          FilePurpose.Preservation,
          fileCopyProgressCallback,
          errorCallback
        )
        if (file) { carpentersFiles.push(file) }
      }
      if (modifiedMasterFilenames) {
        const file: IFile | null = await this._copyFiles(
          orgFilename,
          modifiedMasterFilenames,
          containerPath,
          this.modifiedMasterPath,
          objectIndex,
          index,
          FilePurpose.ModifiedMaster,
          fileCopyProgressCallback,
          errorCallback
        )
        if (file) { carpentersFiles.push(file) }
      }
    }

    return carpentersFiles
  }

  private async _copyFiles(
    originalFilename: ISourceFile,
    files: ReadonlyArray<ISourceFile>,
    containerPath: string,
    srcPath: string,
    objectIndex: number,
    fileIndex: number,
    purpose: FilePurpose,
    fileCopyProgressCallback: (progress: IFileProgress) => void,
    errorCallback: (error: IExportError) => void
  ): Promise<any> {

    const disPurpose = purpose === FilePurpose.Access ? 'access' :
      purpose === FilePurpose.Preservation ? 'preservation' : ''
    const f = files.find(file => originalFilename.name === file.name)
    if (!f) {
      errorCallback({
        description: `Missing ${disPurpose} file: ${originalFilename.filename}`
      })
      return null
    }

    const destPath = `${this.exportLocation}/Files/${containerPath}`
    const filename = `${padLeft(objectIndex, 4, '0')}_${padLeft(fileIndex, 4, '0')}${filePostfix(purpose)}${f.ext}`

    await createDirectories(destPath)

    const src = `${srcPath}/${f.filename}`
    const dest = `${destPath}${filename}`
    try {
      await copyFileToProject(src, dest, (progress) => {
        const total = filesize(progress.total, { round: 1 })
        fileCopyProgressCallback({
          description: `Copying ${disPurpose} file: ${f.filename} (${total})`,
        })
      })
    } catch (err) {
      errorCallback({
        description: `Couldn't copy file ${f.filename}: ${err}`
      })
      return null
    }
    return {
      path: `Files/${containerPath}${filename}`,
      purpose: purpose
    }
  }

  private addContainer(container: IContainer, index: number): IContainer {
    const newContainer = { ...container }
    if (!container.type_1) {
      newContainer.type_1 = 'Item'
      newContainer.indicator_1 = index
    }
    else if (!container.type_2) {
      newContainer.type_2 = 'Item',
        newContainer.indicator_2 = index
    }
    else if (!container.type_3) {
      newContainer.type_3 = 'Item'
      newContainer.indicator_3 = index
    }
    return newContainer
  }

  private getCdmFilenames(files: ReadonlyArray<any>): ReadonlyArray<ISourceFile> | null {
    return files.map((file) => {
      const info = parse(file.accessFilename)
      return {
        filename: file.accessFilename,
        name: info.name,
        ext: info.ext
      }
    })
  }

  private getFilenames(path: string): ReadonlyArray<ISourceFile> | null {
    if (path === '') {
      return null
    }
    try {
      accessSync(path, constants.F_OK | constants.R_OK)
      const files = readdirSync(path)
      return files.map((file) => {
        const info = parse(file)
        return {
          filename: file,
          name: info.name,
          ext: info.ext
        }
      })
    } catch (err) {
      return null
    }
  }

  private async reportMissedFiles(cdmFiles: ReadonlyArray<ISourceFile>): Promise<any> {
    const accessFilenames = this.getFilenames(this.accessPath)
    const preservationFilenames = this.getFilenames(this.preservationPath)
    const modifiedMasterFilenames = this.getFilenames(this.modifiedMasterPath)

    const accessDifference = accessFilenames ?
      accessFilenames.filter((file) => {
        return cdmFiles.findIndex(f => f.name === file.name) === -1
      })
      : []
    const preservationDifference = preservationFilenames ?
      preservationFilenames.filter((file) => {
        return cdmFiles.findIndex(f => f.name === file.name) === -1
      })
      : []
    const modifiedMasterDifference = modifiedMasterFilenames ?
      modifiedMasterFilenames.filter((file) => {
        return cdmFiles.findIndex(f => f.name === file.name) === -1
      })
      : []

    if (
      accessDifference.length > 0 ||
      preservationDifference.length > 0 ||
      modifiedMasterDifference.length > 0
    ) {
      this.outputMissedFileReport(
        accessDifference,
        preservationDifference,
        modifiedMasterDifference
      )
    }
  }

  private outputMissedFileReport(
    access: ReadonlyArray<ISourceFile>,
    preservation: ReadonlyArray<ISourceFile>,
    modifiedMaster: ReadonlyArray<ISourceFile>
  ) {

    const date = this.toLocalDateString()
    const alias = this.exportAlias.replace('/', '')
    const outputLocation = `${this.exportLocation}/missed_files_${alias}_${date}.txt`
    const outputAccess = access.map(a => `${this.accessPath}/${a.filename}`)
    const outputPreservation = preservation.map(p => `${this.preservationPath}/${p.filename}`)
    const outputModifiedMaster = modifiedMaster.map(m => `${this.modifiedMasterPath}/${m.filename}`)

    const output = ""
      + `Access Files:\n${outputAccess.join("\n")}`
      + "\n\n"
      + `Preservation Files:\n${outputPreservation.join("\n")}`
      + "\n\n"
      + `Modified Master Files:\n${outputModifiedMaster.join("\n")}`

    writeFile(outputLocation, output, (err) => {
      if (err) {
        console.error(err)
      }
    })
  }

  private downloadLocation(location: string): string {
    let csvFile = basename(location)
    let newLocation = dirname(location) + '/' + basename(location, '.csv')

    try {
      sync(newLocation)
    }
    catch (err) {
      return location
    }

    return newLocation + '/' + csvFile
  }

  private _missingFields(
    fields: ReadonlyArray<IField>,
    crosswalk: ICrosswalkFieldHash
  ): ReadonlyArray<string> | null {
    if (!crosswalk) {
      return ["No fields mapped"]
    }

    const required = fields.filter(field => field.required)
    const missing = required.filter(field => {
      if (!(field.id in crosswalk)) {
        return false
      }
      return crosswalk[field.id].nicks.filter((nick: string) => nick !== '').length === 0
    })

    const err = missing.map((field) => {
      return `Missing required field '${field.name}'`
    })

    return err.length > 0 ? err : null
  }

  private processErrors(errors: ReadonlyArray<IExportError>, location: string) {
    const date = this.toLocalDateString()
    const alias = this.exportAlias.replace('/', '')
    const errorLocation = dirname(location) + `/errors_${alias}_${date}.txt`
    let errorString = ""
    errors.map((error) => {
      errorString += error.description + "\n"
    })
    writeFile(errorLocation, errorString, (err) => {
      if (err) {
        console.error(err)
      }
    })
  }

  private toLocalDateString(): string {
    const date = new Date()
    return String(date.getFullYear()) +
      ('0' + (date.getMonth() + 1)).slice(-2) +
      ('0' + date.getDate()).slice(-2) + '_' +
      ('0' + date.getHours()).slice(-2) +
      ('0' + date.getMinutes()).slice(-2)
  }

  private processingType(fieldType: string): ProcessingType {
    const type = fieldType.toLowerCase()
    if (type === 'image') {
      return ProcessingType.Image
    }
    else if (type === 'text') {
      return ProcessingType.Text
    }
    return ProcessingType.Unknown
  }

  private processingTypeNotes(fieldType: string): string {
    const types = fieldType.split(';')

    if (types.length >= 2) {
      return 'Review processing type and Type metadata field'
    }

    return ''
  }

  private fixMultipleTypeFieldValues(fieldType: string): string {
    const types = fieldType.split(';')
    if (types.length >= 2) {
      return ''
    }
    return fieldType
  }
}