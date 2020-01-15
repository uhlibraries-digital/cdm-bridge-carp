import { v4 } from 'uuid'
import {
  access,
  constants
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

export async function createContinerFilesystem(
  projectpath: string,
  objects: ReadonlyArray<IObject>
) {
  if (projectpath === '') {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    objects.map((object) => {
      const path = containerToPath(object.containers[0])
      access(`${projectpath}/Files/${path}`, constants.F_OK, (err) => {
        if (err) {
          mkdirp(`${projectpath}/Files/${path}`, (err) => {
            return err ? reject() : resolve()
          })
        }
      })
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