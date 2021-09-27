import rp from 'request-promise'

export interface IVocabulary {
  readonly identifier: string
  readonly prefLabel: string
  readonly narrow: ReadonlyArray<IVocabulary>
}

export interface IVocabularyMapRange {
  readonly prefLabel: string
  readonly nodes: ReadonlyArray<IVocabulary>
}

export async function prefLabel(url: string): Promise<any> {
  const isRdf = url.substr(url.length - 4) === '.rdf'

  if (!isRdf) {
    url += '.rdf'
  }

  return _request(url)
    .then((response) => {
      const parser = new DOMParser()
      const xml = parser.parseFromString(response, 'text/xml')
      const prefLabels = xml.getElementsByTagNameNS(
        'http://www.w3.org/2004/02/skos/core#',
        'prefLabel'
      )

      return prefLabels[prefLabels.length - 1].textContent
    })
}

async function _request(url: string): Promise<any> {
  const options = {
    url: url,
    headers: {
      Connection: 'keep-alive'
    },
    forever: true,
    resolveWithFullResponse: true,
    simple: false
  }

  return rp(options)
    .then((response) => {
      if (response.statusCode !== 200) {
        console.error(response)
        throw new Error(response.statusCode + ': ' + response.statusMessage)
      }
      return response.body
    })
    .catch((err) => {
      if (err.message === 'Error: socket hang up') {
        console.warn(err)
        return _request(url)
      }
      throw err
    })
}