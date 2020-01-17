import { v4 } from 'uuid'
import {
  access,
  constants,
  accessSync,
  lstatSync,
  copyFile
} from 'fs'
import mkdirp from 'mkdirp'
import { padLeft } from './string'

export enum ProjectType {
  Archival = "findingaid",
  NonArchival = "standard"
}

export enum FilePurpose {
  Preservation = "preservation",
  Access = "access-copy",
  ModifiedMaster = "modified-master",
  SubmissionDocumentation = "sub-documents"
}

export interface IProject {
  type: ProjectType
  resource: string
  collectionTitle: string
  collectionArkUrl: string
  aic: string
  objects: ReadonlyArray<IObject>
}

export interface IObject {
  uuid: string
  title: string
  dates: ReadonlyArray<string>
  containers: ReadonlyArray<IContainer>
  level: string
  artificial: boolean
  parent_uri: string | null
  uri: string | null
  productionNotes: string
  do_ark: string
  pm_ark: string
  metadata: any
  files: ReadonlyArray<IFile>
}

export interface IContainer {
  top_container: ITopContainer | null
  type_1: string | null
  indicator_1: number | null
  type_2: string | null
  indicator_2: number | null
  type_3: string | null
  indicator_3: number | null
}

export interface ITopContainer {
  ref: string
}

export interface IFile {
  path: string
  purpose: FilePurpose
}

export interface IFileCopyProgress {
  readonly transfered: number
  readonly total: number
}

export function newObject(title: string) {
  return {
    uuid: v4(),
    title: title,
    dates: [],
    containers: [],
    level: 'item',
    uri: null,
    productionNotes: '',
    do_ark: '',
    pm_ark: '',
    metadata: {},
    files: []
  }
}

export async function createContainerFilesystem(
  projectpath: string,
  objects: ReadonlyArray<IObject>
) {
  if (projectpath === '') {
    return Promise.resolve()
  }

  return Promise.all(objects.map((object) => {
    const path = containerToPath(object.containers[0])
    const fullPath = `${projectpath}/Files/${path}`
    return createDirectories(fullPath)
  }))
}

export async function createDirectories(
  path: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    access(path, constants.F_OK, (err) => {
      if (err) {
        mkdirp(path, (err) => {
          return err ? reject(err) : resolve()
        })
      }
      else {
        return resolve()
      }
    })
  })
}

export const containerToPath = (container: IContainer | null) => {
  if (!container) {
    return ''
  }

  const path = `${container.type_1}_${padLeft(container.indicator_1, 3, '0')}/` +
    (container.type_2 ?
      `${container.type_2}_${padLeft(container.indicator_2, 3, '0')}/`
      : '') +
    (container.type_3 ?
      `${container.type_3}_${padLeft(container.indicator_3, 3, '0')}/`
      : '')

  return path.replace(' ', '_')
}

export async function copyFileToProject(
  src: string,
  dest: string,
  progressCallback: (progress: IFileCopyProgress) => void
): Promise<any> {
  try {
    accessSync(src)
  } catch (e) { return Promise.reject(`Could not file file: ${src}`) }

  return new Promise((resolve, reject) => {
    const state = lstatSync(src)
    const totalSize = state.size
    progressCallback({
      transfered: 0,
      total: totalSize
    })
    copyFile(src, dest, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

export const filePostfix = (purpose: FilePurpose) => {
  if (purpose == FilePurpose.Access) {
    return '_ac'
  }
  if (purpose === FilePurpose.Preservation) {
    return '_pm'
  }
  if (purpose === FilePurpose.ModifiedMaster) {
    return '_mm'
  }
  return ''
}