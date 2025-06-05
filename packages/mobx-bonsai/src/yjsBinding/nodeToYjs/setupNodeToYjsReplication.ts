import { when } from "mobx"
import type * as Y from "yjs"
import { failure } from "../../error/failure"
import { resolveYjsStructurePath } from "./resolveYjsStructurePath"
import { convertPlainToYjsValue } from "./convertPlainToYjsValue"
import { buildNodeFullPath } from "../../node/utils/buildNodeFullPath"
import { onDeepChange, NodeChange } from "../../node/node"
import { YjsStructure } from "../yjsTypes/types"
import { requireYjs } from "../requireYjs"

export function setupNodeToYjsReplication({
  node,
  yjsDoc,
  yjsObject,
  yjsOrigin,
  yjsReplicatingRef,
}: {
  node: object
  yjsDoc: Y.Doc
  yjsObject: YjsStructure
  yjsOrigin: symbol
  yjsReplicatingRef: { current: number }
}) {
  const Y = requireYjs()

  let pendingMobxChanges: {
    change: NodeChange
    path: string[]
  }[] = []
  let mobxDeepChangesNestingLevel = 0

  const disposeOnDeepChange = onDeepChange(node, (change) => {
    // if this comes from a yjs change, ignore it
    if (yjsReplicatingRef.current > 0) {
      return
    }

    mobxDeepChangesNestingLevel++
    const path = buildNodeFullPath(change.object)
    pendingMobxChanges.push({ change, path })

    // hack to apply pending mobx changes once all actions and reactions are finished
    when(
      () => true,
      () => {
        mobxDeepChangesNestingLevel--
        if (mobxDeepChangesNestingLevel === 0) {
          yjsDoc.transact(() => {
            const mobxChangesToApply = pendingMobxChanges
            pendingMobxChanges = []
            mobxChangesToApply.forEach(({ change, path }) => {
              const yjsTarget = resolveYjsStructurePath(yjsObject, path)

              // now y.js and mobx should be in the same target

              switch (change.observableKind) {
                case "object": {
                  if (!(yjsTarget instanceof Y.Map)) {
                    throw failure("yjs target was expected to be a map")
                  }
                  const yjsMap = yjsTarget

                  switch (change.type) {
                    case "add":
                    case "update":
                      yjsMap.set(String(change.name), convertPlainToYjsValue(change.newValue))
                      break

                    case "remove":
                      yjsMap.delete(String(change.name))
                      break

                    default:
                      throw failure(`unsupported mobx object change type`)
                  }
                  break
                }

                case "array": {
                  if (!(yjsTarget instanceof Y.Array)) {
                    throw failure("yjs target was expected to be an array")
                  }
                  const yjsArray = yjsTarget

                  switch (change.type) {
                    case "update": {
                      yjsArray.delete(change.index, 1)
                      yjsArray.insert(change.index, [convertPlainToYjsValue(change.newValue)])
                      break
                    }

                    case "splice": {
                      yjsArray.delete(change.index, change.removedCount)
                      yjsArray.insert(change.index, change.added.map(convertPlainToYjsValue))
                      break
                    }

                    default:
                      throw failure(`unsupported mobx array change type`)
                  }
                  break
                }

                default:
                  throw failure(`unsupported mobx change`)
              }
            })
          }, yjsOrigin)
        }
      }
    )
  })

  return {
    dispose: () => {
      disposeOnDeepChange()
    },
  }
}
