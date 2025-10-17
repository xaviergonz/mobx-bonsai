/**
 * A mobx-bonsai-yjs error.
 */
export class MobxBonsaiYjsError extends Error {
  constructor(msg: string) {
    super(msg)

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, MobxBonsaiYjsError.prototype)
  }
}
