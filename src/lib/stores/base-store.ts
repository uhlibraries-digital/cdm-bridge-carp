import { Emitter, Disposable } from 'event-kit'

export abstract class BaseStore {
  protected readonly emitter = new Emitter()

  protected emitUpdate() {
    this.emitter.emit('did-update', {})
  }

  protected emitError(error: Error) {
    this.emitter.emit('did-error', error)
  }

  public onDidUpdate(fn: () => void): Disposable {
    return this.emitter.on('did-update', fn)
  }

  public onDidError(fn: (e: Error) => void): Disposable {
    return this.emitter.on('did-error', fn)
  }
}

export class TypedBaseStore<T> {
  protected readonly emitter = new Emitter()

  protected emitUpdate(data: T) {
    this.emitter.emit('did-update', data)
  }

  protected emitError(error: Error) {
    this.emitter.emit('did-error', error)
  }

  public onDidUpdate(fn: (data: T) => void): Disposable {
    return this.emitter.on('did-update', fn)
  }

  public onDidError(fn: (e: Error) => void): Disposable {
    return this.emitter.on('did-error', fn)
  }
}