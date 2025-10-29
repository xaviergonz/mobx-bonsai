import { _getGlobalState } from "mobx"

/**
 * Checks if we're currently inside a MobX action/batch/transaction.
 * Uses MobX's global state to check the inBatch counter.
 *
 * @internal
 * @returns true if inside any MobX action, batch, or transaction
 */
export function isInsideMobxAction(): boolean {
  return _getGlobalState().inBatch > 0
}
