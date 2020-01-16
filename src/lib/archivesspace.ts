import * as rp from 'request-promise'

export type ArchivesSpaceServer = {
  endpoint: string,
  username: string,
  password: string
}

export type ArchivesSpaceToken = {
  session: string,
  expires: number
}

export type IResource = {
  uri: string,
  title: string
}

export class ArchivesSpace {
  private token: ArchivesSpaceToken | null = null

  public constructor(public server: ArchivesSpaceServer | null) { }

  public async getResources(uri: string): Promise<any> {
    const pagesize = 100
    const result = await this._request(uri, { page_size: pagesize, page: 1, type: ["resource"] })
    let resources: Array<IResource> = result.results as Array<IResource>
    for (let page = 2; page <= result.last_page; page++) {
      const r = await this._request(uri, { page_size: pagesize, page: page, type: ["resource"] })
      resources = resources.concat(r.results)
    }

    return resources
  }

  public async getArchivalObject(uri: string): Promise<any> {
    return this._request(uri)
      .catch((error) => {
        throw error
      })
  }

  public async getTopContainer(uri: string): Promise<any> {
    return this._request(uri)
      .catch((error) => {
        throw error
      })
  }

  private async _request(uri: string, params?: any): Promise<any> {
    if (!this.server) {
      throw new Error('Unable to get server information')
    }
    const today = new Date();
    if (!this.token || this.token.expires <= today.getTime()) {
      try {
        await this._setSessionToken()
      } catch (err) { throw err }
    }

    const options = {
      uri: `${this.server.endpoint}${uri}`,
      qs: params,
      headers: {
        'X-ArchivesSpace-Session': this.token ? this.token.session : ''
      },
      json: true,
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
      .catch((error) => {
        throw error
      })
  }

  private async _setSessionToken(): Promise<any> {
    if (!this.server) {
      throw new Error('Unable to get server information')
    }
    const url = `${this.server.endpoint}/users/${this.server.username}/login`

    const options = {
      method: 'POST',
      uri: url,
      form: {
        password: this.server.password
      },
      resolveWithFullResponse: true,
      json: true
    }
    return rp(options)
      .then((response) => {
        if (response.statusCode !== 200) {
          console.error(response)
          throw new Error(response.statusCode + ': ' + response.error.error)
        }
        const now = new Date()
        this.token = {
          session: response.body.session,
          expires: now.getTime()
        }
        return this.token
      })
      .catch((err) => {
        throw new Error(`ArchviesSpace: ${err.error.error}`)
      })
  }

}