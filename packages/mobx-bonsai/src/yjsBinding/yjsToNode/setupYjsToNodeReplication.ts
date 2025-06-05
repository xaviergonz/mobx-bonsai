import { isObservableArray, isObservableObject, remove, runInAction, set } from "mobx"
import type * as Y from "yjs"
import { failure } from "../../error/failure"
import { assertIsNode, runDetachingDuplicatedNodes } from "../../node/node"
import { resolvePath } from "../../node/tree/resolvePath"
import { Primitive } from "../../plainTypes/types"
import { isPrimitive } from "../../plainTypes/checks"
import { YjsStructure, YjsValue } from "../yjsTypes/types"
import { requireYjs } from "../requireYjs"

function yjsToPlainValue<T extends Primitive>(v: T): T
function yjsToPlainValue(v: Y.Map<any>): Record<string, any>
function yjsToPlainValue(v: Y.Array<any>): any[]

function yjsToPlainValue(v: YjsValue): unknown {
  if (isPrimitive(v)) {
    return v
  }

  const Y = requireYjs()

  if (v instanceof Y.Map || v instanceof Y.Array) {
    return v.toJSON()
  }

  throw failure(`unsupported Y.js value type: ${v}`)
}

export function setupYjsToNodeReplication({
  node,
  yjsObject,
  yjsOrigin,
  yjsReplicatingRef,
}: {
  node: object
  yjsObject: YjsStructure
  yjsOrigin: symbol
  yjsReplicatingRef: { current: number }
}) {
  const Y = requireYjs()

  const yjsObserverCallback = (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
    if (transaction.origin === yjsOrigin || events.length === 0) {
      return
    }

    // lock to ensure mobx changes don't trigger yjs changes again
    yjsReplicatingRef.current++

    try {
      runInAction(() => {
        runDetachingDuplicatedNodes(() => {
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
              if (!isObservableObject(mobxTarget)) {
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
