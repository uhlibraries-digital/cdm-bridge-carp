import { BaseStore } from './base-store'
import rp from 'request-promise'
import {
  IVocabulary,
  IVocabularyMapRange
} from '../vocabulary'
import { electronStore } from './electron-store'

export class VocabularyStore extends BaseStore {

  private ranges: ReadonlyArray<IVocabularyMapRange> = []

  public async loadVocabulary(url: string): Promise<any> {
    if (!url) {
      return Promise.reject(new Error('No vocabulary url set. Please check preferences.'))
    }

    return rp(url)
      .then((body) => {
        const vocab = this.parse(body)
        electronStore.set('vocabulary', JSON.stringify(vocab))
        this.emitUpdate()
      })
      .catch((err) => {
        const error = err.statusCode || err.message || err
        this.emitError(new Error(`Vocabulary error: ${error}`))
      })
  }

  public getVocabulary(): ReadonlyArray<IVocabulary> {
    const vocab = JSON.parse(
      String(electronStore.get('vocabulary', 'null'))
    ) as ReadonlyArray<IVocabulary>

    return vocab
  }

  public async loadVocabularyRange(prefLabel: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (prefLabel === '') {
        return
      }
      const newRanges = Array.from(this.ranges)
      const rangeIndex = newRanges.findIndex(range => range.prefLabel === prefLabel)
      const range = this.generateVocabularyRange(prefLabel)

      if (rangeIndex > -1) {
        newRanges.splice(rangeIndex, 1)
      }
      newRanges.push({
        prefLabel: prefLabel,
        nodes: range
      })
      this.ranges = newRanges
      resolve()
    })
  }

  public getVocabularyRange(prefLabel: string): IVocabularyMapRange | null {
    const range = this.ranges.find(node => node.prefLabel === prefLabel)
    return range || null
  }

  public getVocabularyRanges(): ReadonlyArray<IVocabularyMapRange> {
    return this.ranges
  }

  public clearVocabularyRages() {
    this.ranges = []
  }

  private generateVocabularyRange(prefLabel: string): ReadonlyArray<IVocabulary> {
    const vocab = this.getVocabulary()
    const node = vocab.find(n => n.prefLabel.toLowerCase() === prefLabel.toLowerCase())
    const list = node ? this.getRanges(node.narrow) : []

    return list
  }

  private getRanges(nodes: ReadonlyArray<IVocabulary>): ReadonlyArray<IVocabulary> {
    let newNodes = Array.from(nodes)
    for (let node of newNodes) {
      newNodes = newNodes.concat(this.getRanges(node.narrow))
    }
    return newNodes
  }

  public parse(data: string): ReadonlyArray<IVocabulary> {
    const dataNodes = data.match(/[^A-Za-z ]:(?:[^\"]|(?:\".*?\"))*?[.]/gm);
    if (!dataNodes) {
      return []
    }

    const nodes: Array<IVocabulary> = []
    dataNodes.map((node) => {
      const idMatch = /^:([^\s]*)/m.exec(node)
      if (!idMatch) {
        return
      }
      const identifier = idMatch[1].toLowerCase().replace(' ', '')
      const labelRegexp = node.match(/prefLabel \"([^\"]*)\"/m)
      const label = labelRegexp ? String(labelRegexp[1]) : ''
      const narrowerMatch = node.match(/:narrower :[^;\.]*[;\.]/gm) || []

      const narrower = narrowerMatch.map((narrow) => {
        const idMatch = /\s:(.*)[;\.]/g.exec(narrow)
        if (!idMatch) {
          return
        }
        const identifier = idMatch[1].toLowerCase().replace(' ', '')
        const node = nodes.find(node => node.identifier === identifier)
        return node
      }) as Array<IVocabulary>

      nodes.push({
        identifier: identifier,
        prefLabel: label,
        narrow: narrower
      })

    })

    return nodes
  }


}