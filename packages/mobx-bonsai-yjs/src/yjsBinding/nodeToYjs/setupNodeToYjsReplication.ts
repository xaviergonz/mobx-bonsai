import { when } from "mobx"
import { _buildNodeFullPath, NodeChange, onDeepChange } from "mobx-bonsai"
import * as Y from "yjs"
import { failure } from "../../error/failure"
import { YjsStructure } from "../yjsTypes/types"
import { convertPlainToYjsValue } from "./convertPlainToYjsValue"
import { resolveYjsStructurePath } from "./resolveYjsStructurePath"

export function setupNodeToYjsReplication({
  node,
  yjsDoc,
  yjsObject,
  yjsOriginGetter,
  yjsOriginCache,
  yjsReplicatingRef,
}: {
  node: object
  yjsDoc: Y.Doc
  yjsObject: YjsStructure
  yjsOriginGetter: () => symbol
  yjsOriginCache: WeakSet<symbol>
  yjsReplicatingRef: { current: number }
}) {
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
    const path = _buildNodeFullPath(change.object)
    pendingMobxChanges.push({ change, path })

    // hack to apply pending mobx changes once all actions and reactions are finished
    when(
      () => true,
      () => {
        mobxDeepChangesNestingLevel--
        if (mobxDeepChangesNestingLevel === 0) {
          const yjsOrigin = yjsOriginGetter()
          yjsOriginCache.add(yjsOrigin)

          yjsDoc.transact(() => {
            const mobxChangesToApply = pendingMobxChanges
            pendingMobxChanges = []
            mobxChangesToApply.forEach(({ change, path }) => {
              const yjsTarget = resolveYjsStructurePath(yjsObject, path)

              // now y.js and mobx should be in the same target

              // In MobX 5, observableKind doesn't exist, but we can check for the presence of 'name' vs 'index'
              // to distinguish between object and array changes
              const isObjectChange = "name" in change

              if (isObjectChange) {
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
              } else {
                // Array change
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
