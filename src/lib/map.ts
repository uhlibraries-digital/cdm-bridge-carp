import * as rp from 'request-promise'

export type BcdamsMapField = {
  readonly label: string
  readonly namespace: string
  readonly name: string
  readonly obligation: string
}

export class BcdamsMap {

  public constructor(public url: string) { }

  public async fields(): Promise<any> {
    const options = {
      url: this.url,
      headers: {
        Connection: 'keep-alive'
      },
      forever: true,
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
        return response.body as ReadonlyArray<BcdamsMapField>
      })
      .catch((err) => {
        throw err
      })


  }
}