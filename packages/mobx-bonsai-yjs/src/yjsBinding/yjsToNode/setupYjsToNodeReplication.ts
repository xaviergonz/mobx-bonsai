import { isObservableArray, remove, runInAction, set } from "mobx"
import {
  _isPrimitive,
  _Primitive,
  _runDetachingDuplicatedNodes,
  assertIsNode,
  resolvePath,
} from "mobx-bonsai"
import * as Y from "yjs"
import { failure } from "../../error/failure"
import { YjsStructure, YjsValue } from "../yjsTypes/types"

function yjsToPlainValue<T extends _Primitive>(v: T): T
function yjsToPlainValue(v: Y.Map<any>): Record<string, any>
function yjsToPlainValue(v: Y.Array<any>): any[]

function yjsToPlainValue(v: YjsValue): unknown {
  if (_isPrimitive(v)) {
    return v
  }

  if (v instanceof Y.Map || v instanceof Y.Array) {
    return v.toJSON()
  }

  throw failure(`unsupported Y.js value type: ${v}`)
}

export function setupYjsToNodeReplication({
  node,
  yjsObject,
  yjsOriginCache,
  yjsReplicatingRef,
}: {
  node: object
  yjsObject: YjsStructure
  yjsOriginCache: WeakSet<symbol>
  yjsReplicatingRef: { current: number }
}) {
  const yjsObserverCallback = (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
    if (events.length === 0) {
      return
    }

    // if it comes from a mobx-bonsai-yjs change, ignore it
    if (yjsOriginCache.has(transaction.origin)) {
      return
    }

    // lock to ensure mobx changes don't trigger yjs changes again
    yjsReplicatingRef.current++

    try {
      runInAction(() => {
        _runDetachingDuplicatedNodes(() => {
          events.forEach((event) => {
            const resolutionResult = resolvePath(node, event.path)
            if (!resolutionResult.resolved) {
              throw failure(
                `failed to resolve node path for yjs event: ${JSON.stringify(event.path)}`
              )
            }
            const mobxTarget = resolutionResult.value
            assertIsNode(mobxTarget, "mobxTarget")

            // now y.js and mobx should be in the same target

            if (event instanceof Y.YMapEvent) {
              // Directly check if it's an array (arrays are objects too)
              if (Array.isArray(mobxTarget)) {
                throw failure("mobx target was expected to be an object")
              }

              const mobxObject = mobxTarget
              const yjsMap = event.target

              event.changes.keys.forEach((change, key) => {
                switch (change.action) {
                  case "add":
                  case "update":
                    {
                      // we have to check because sometimes yjs sends
                      // an update event for something already there
                      const yjsValue = yjsToPlainValue(yjsMap.get(key))
                      if ((mobxObject as any)[key] !== yjsValue) {
                        set(mobxObject, key, yjsValue)
                      }
                    }
                    break

                  case "delete":
                    // we have to check because sometimes yjs sends
                    // an update event for something already there
                    if ((mobxObject as any)[key] !== undefined) {
                      remove(mobxObject, key)
                    }
                    break

                  default:
                    throw failure(`unsupported Yjs map event action: ${change.action}`)
                }
              })
            } else if (event instanceof Y.YArrayEvent) {
              if (!isObservableArray(mobxTarget)) {
                throw failure("mobx target was expected to be an array")
              }

              const mobxArray = mobxTarget
              let retain = 0

              event.changes.delta.forEach((change) => {
                if (change.retain) {
                  retain += change.retain
                }

                if (change.delete) {
                  // remove X items at retain position
                  mobxArray.splice(retain, change.delete)
                }

                if (change.insert) {
                  const newValues = Array.isArray(change.insert) ? change.insert : [change.insert]
                  mobxArray.splice(retain, 0, ...newValues.map((v) => yjsToPlainValue(v)))
                  retain += newValues.length
                }
              })
            } else {
              throw failure("unsupported Y.js event type")
            }
          })
        })
      })
    } finally {
      yjsReplicatingRef.current--
    }
  }

  yjsObject.observeDeep(yjsObserverCallback)

  return {
    dispose: () => {
      yjsObject.unobserveDeep(yjsObserverCallback)
    },
  }
}
