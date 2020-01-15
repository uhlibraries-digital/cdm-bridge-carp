import { TypedBaseStore } from './base-store'
import { TokenStore } from './token-store'

export interface IArchivesSpaceStoreState {
  readonly endpoint: string
  readonly username: string
  readonly password?: string
}

export class ArchivesSpaceStore extends TypedBaseStore<IArchivesSpaceStoreState | null> {
  private state: IArchivesSpaceStoreState | null = null

  public getState(): IArchivesSpaceStoreState | null {
    return this.state
  }

  public setState(state: IArchivesSpaceStoreState | null) {
    if (state && state.password) {
      TokenStore.setItem('cdmbridge2carp/archivesspace', state.username, state.password)
    }

    this.state = state

    this.emitUpdate(this.getState())
  }
}