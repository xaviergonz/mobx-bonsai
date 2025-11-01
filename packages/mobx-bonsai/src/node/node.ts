import deepFreeze from "deep-freeze"
import {
  action,
  createAtom,
  IArrayDidChange,
  IArrayWillChange,
  IArrayWillSplice,
  IAtom,
  IObjectDidChange,
  IObjectWillChange,
  intercept,
  ObservableSet,
  observable,
  observe,
  set,
  toJS,
} from "mobx"
import { failure } from "../error/failure"
import { isArray, isObservablePlainStructure, isPrimitive } from "../plainTypes/checks"
import { Dispose, disposeOnce } from "../utils/disposable"
import { inDevMode } from "../utils/inDevMode"
import {
  getNodeTypeAndKey,
  NodeWithAnyType,
  nodeTypeKey,
  tryRegisterNodeByTypeAndKey,
} from "./nodeTypeKey/nodeType"
import { reconcileData } from "./reconcileData"
import { invalidateSnapshotTreeToRoot } from "./snapshot/getSnapshot"
import { getParent } from "./tree/getParent"
import { buildNodeFullPath } from "./utils/buildNodeFullPath"

type ParentNode = {
  object: object
  path: string
}

export type NodeChange = IObjectDidChange | IArrayDidChange

export type NodeChangeListener = (change: NodeChange) => void

/**
 * Represents a change that is about to happen to a node during the intercept phase.
 */
export type NodeInterceptedChange =
  | IObjectWillChange
  | IArrayWillChange<any>
  | IArrayWillSplice<any>

/**
 * Listener for intercepted changes. Must return:
 * - The change object (possibly modified) to accept the change
 * - null to cancel the change and stop propagation to parent listeners
 */
export type NodeInterceptedChangeListener = (
  change: NodeInterceptedChange
) => NodeInterceptedChange | null

type NodeData = {
  parent: ParentNode | undefined
  parentAtom: IAtom | undefined
  onChangeListeners: NodeChangeListener[] | undefined
  onInterceptedChangeListeners: NodeInterceptedChangeListener[] | undefined
  childrenObjects: ObservableSet<object> | undefined
  frozen: boolean
}

export function getNodeData(node: object): NodeData {
  assertIsNode(node, "node")
  return nodes.get(node)!
}

export function reportNodeParentObserved(node: object): void {
  const data = getNodeData(node)
  if (!data.parentAtom) {
    data.parentAtom = createAtom("parent")
  }
  data.parentAtom.reportObserved()
}

const nodes = new WeakMap<object, NodeData>()

function setParentNode(node: object, parentNode: ParentNode | undefined): void {
  const nodeData = getNodeData(node)
  nodeData.parent = parentNode
  nodeData.parentAtom?.reportChanged()
}

/**
 * Checks if the given object is a MobX-Bonsai node.
 *
 * @param struct The object to check.
 * @returns `true` if the object is a MobX-Bonsai node, `false` otherwise.
 */
export function isNode(struct: unknown): boolean {
  return nodes.has(struct as object)
}

/**
 * Checks if the given node is frozen.
 * A frozen node is a node that cannot be modified.
 *
 * @param node - The object to check.
 * @returns `true` if the object is a node and is frozen, `false` otherwise.
 */
export function isFrozenNode(node: object): boolean {
  return getNodeData(node).frozen
}

/**
 * Asserts that the given object is a mobx-bonsai node.
 *
 * @param node The object to check.
 * @param argName The name of the argument being checked. This is used in the error message.
 * @throws If the object is not a mobx-bonsai node.
 */
export function assertIsNode(node: object, argName: string): void {
  if (!isNode(node)) {
    throw failure(`${argName} must be a mobx-bonsai node`)
  }
}

function emitToListeners<TChange>(
  listeners: Array<(change: TChange) => void> | undefined,
  change: TChange
) {
  if (listeners && listeners.length > 0) {
    listeners.forEach((listener) => {
      listener(change)
    })
  }
}

function emitChangeToRoot(eventTarget: object, change: IObjectDidChange | IArrayDidChange) {
  let currentTarget: object | undefined = eventTarget
  while (currentTarget) {
    const changeListeners = getNodeData(currentTarget).onChangeListeners
    emitToListeners(changeListeners, change)
    currentTarget = getParent(currentTarget)
  }
}

function emitInterceptedChangeToRoot(
  eventTarget: object,
  change: IObjectWillChange | IArrayWillChange<any> | IArrayWillSplice<any>
): NodeInterceptedChange | null {
  let currentChange: NodeInterceptedChange = change
  let currentTarget: object | undefined = eventTarget

  while (currentTarget) {
    const interceptedChangeListeners = getNodeData(currentTarget).onInterceptedChangeListeners

    if (interceptedChangeListeners && interceptedChangeListeners.length > 0) {
      // Call all listeners on the current node
      for (const listener of interceptedChangeListeners) {
        const result = listener(currentChange)
        if (result === undefined) {
          throw failure(
            "onDeepInterceptedChange listener must return either the change object or null, but returned undefined"
          )
        }
        if (result === null) {
          // Change was cancelled - stop propagation immediately
          return null
        }
        // Update the change object with any modifications
        currentChange = result
      }
    }

    currentTarget = getParent(currentTarget)
  }

  return currentChange
}
function registerListener<TListener>(
  node: object,
  listener: TListener,
  listenersProperty: "onChangeListeners" | "onInterceptedChangeListeners"
): Dispose {
  const nodeData = getNodeData(node)
  let listeners = nodeData[listenersProperty] as TListener[] | undefined
  if (!listeners) {
    listeners = []
    nodeData[listenersProperty] = listeners as any
  }
  listeners.push(listener)

  return disposeOnce(() => {
    const currentListeners = nodeData[listenersProperty] as TListener[] | undefined
    if (currentListeners) {
      const index = currentListeners.indexOf(listener)
      if (index !== -1) {
        currentListeners.splice(index, 1)
        if (currentListeners.length === 0) {
          nodeData[listenersProperty] = undefined
        }
      }
    }
  })
}

/**
 * Registers a deep change listener on the provided node that is called BEFORE changes are committed.
 *
 * The listener is invoked whenever the node is about to undergo a change, such as additions,
 * updates, or removals within its observable structure. This is called during the intercept phase,
 * before the change is actually applied. This includes receiving events from both object and array mutations.
 *
 * Note: The listener is called before the change is committed, so the node still has its old state.
 *
 * The listener must return one of the following:
 * - The received change object (possibly modified) to accept and apply the change
 * - null to cancel the change and stop propagation to parent listeners
 *
 * The listener can also throw an exception to prevent the change (e.g., if an invariant isn't met).
 *
 * @param node - The node to attach the intercepted change listener to.
 * @param listener - The callback function that is called when a change is about to occur.
 *   The listener receives a NodeInterceptedChange parameter and must return either the change
 *   object (to accept it) or null (to cancel it).
 *
 * @returns A disposer function that, when invoked, unregisters the listener.
 */
export function onDeepInterceptedChange(
  node: object,
  listener: NodeInterceptedChangeListener
): Dispose {
  return registerListener(node, listener, "onInterceptedChangeListeners")
}

/**
 * Registers a deep change listener on the provided node.
 *
 * The listener is invoked whenever the node undergoes a change, such as additions,
 * updates, or removals within its observable structure. This includes receiving
 * events from both object and array mutations.
 *
 * @param node - The node to attach the change listener to.
 * @param listener - The callback function that is called when a change occurs.
 *   The listener receives two parameters:
 *   - changeTarget: The node where the change occurred.
 *   - change: The change event, which is a NodeChange.
 *
 * @returns A disposer function that, when invoked, unregisters the listener.
 */
export function onDeepChange(node: object, listener: NodeChangeListener): Dispose {
  return registerListener(node, listener, "onChangeListeners")
}

let detachDuplicatedNodes = 0

export const runDetachingDuplicatedNodes = (fn: () => void) => {
  detachDuplicatedNodes++
  try {
    fn()
  } finally {
    detachDuplicatedNodes--
  }
}

/**
 * Converts a plain/observable object or array into a mobx-bonsai node.
 * If the data is already a node it is returned as is.
 * If the data contains a type and key and they match an already existing node
 * then that node is reconciled with the new data and the existing node is returned.
 *
 * @param struct - The object or array to be converted.
 * @param options - Optional configuration object.
 * @property {boolean} [skipInit] - If true, skips the initialization phase.
 *
 * @returns The node, an enhanced observable structure.
 */
export const node = action(
  <T extends object>(
    struct: T,
    options?: {
      skipInit?: boolean
    }
  ): T => {
    if (isNode(struct)) {
      // nothing to do
      return struct
    }

    const { type, key } = getNodeTypeAndKey(struct)
    const keyProp = type && "key" in type ? type.key : undefined

    if (type !== undefined && key !== undefined) {
      const existingNode = "findByKey" in type ? (type.findByKey(key) as T | undefined) : undefined
      if (existingNode) {
        const result = reconcileData(existingNode, struct, existingNode)
        if (result !== existingNode) {
          throw failure("reconciliation should not create a new object")
        }
        return existingNode as T
      }
    }

    const frozen = type && "isFrozen" in type ? type.isFrozen : false

    const nodeData: NodeData = {
      parent: undefined,
      parentAtom: undefined,
      onChangeListeners: undefined,
      onInterceptedChangeListeners: undefined,
      childrenObjects: undefined,
      frozen,
    }

    let nodeStruct: object

    const registerNode = () => {
      if (!nodeStruct) {
        throw failure("nodeStruct is not defined")
      }

      nodes.set(nodeStruct, nodeData)
      tryRegisterNodeByTypeAndKey(nodeStruct)
    }

    if (frozen) {
      const plainStruct = toJS(struct)

      if (inDevMode) {
        deepFreeze(plainStruct)
      }

      nodeStruct = plainStruct
      registerNode()
    } else {
      const observableStruct = (() => {
        if (isObservablePlainStructure(struct)) {
          return struct
        }

        return Array.isArray(struct)
          ? observable.array(struct, { deep: false })
          : observable.object(struct, undefined, { deep: false })
      })()

      nodeStruct = observableStruct
      registerNode()

      const attachAsChildNode = (v: any, path: string, setIfConverted: (n: object) => void) => {
        if (isPrimitive(v)) {
          return
        }

        let n = v
        if (isNode(n)) {
          // ensure it is detached first or at same position
          const parent = getNodeData(n).parent
          if (parent && (parent.object !== observableStruct || parent.path !== path)) {
            if (detachDuplicatedNodes > 0) {
              set(parent.object, parent.path, undefined)
            } else {
              throw failure(
                `The same node cannot appear twice in the same or different trees,` +
                  ` trying to assign it to ${JSON.stringify(buildNodeFullPath(observableStruct, path))},` +
                  ` but it already exists at ${JSON.stringify(buildNodeFullPath(parent.object, parent.path))}.` +
                  ` If you are moving the node then remove it from the tree first before moving it.` +
                  ` If you are copying the node then use 'clone' to make a clone first.`
              )
            }
          }
        } else {
          n = node(v)
          if (n !== v) {
            // actually needed conversion from plain object, or was a unique node that resolved to an existing node
            setIfConverted(n)
          }
        }

        // Lazily create childrenObjects set
        if (!nodeData.childrenObjects) {
          nodeData.childrenObjects = observable.set([], { deep: false })
        }
        nodeData.childrenObjects.add(n)

        setParentNode(n, { object: observableStruct, path })
      }

      const detachAsChildNode = (v: any) => {
        // might not be a node if we convert from observable struct to an existing unique node
        if (!isPrimitive(v) && isNode(v)) {
          setParentNode(v, undefined)
          if (nodeData.childrenObjects) {
            nodeData.childrenObjects.delete(v)
          }
        }
      }

      const isArrayNode = isArray(observableStruct)

      // make current children nodes too (init)
      if (isArrayNode) {
        const array = observableStruct
        array.forEach((v, i) => {
          attachAsChildNode(v, i.toString(), (n) => {
            set(array, i, n)
          })
        })
      } else {
        const object = observableStruct as any
        Object.entries(object).forEach(([key, v]) => {
          attachAsChildNode(v, key, (n) => {
            set(object, key, n)
          })
        })
      }

      // and observe changes
      if (isArrayNode) {
        // we don't use change.object because it is bugged in some old versions of mobx
        const array = observableStruct

        intercept(array, (change) => {
          // Emit intercepted change BEFORE processing
          const wrappedChange = emitInterceptedChangeToRoot(array, change)
          if (wrappedChange === null) {
            // Change was cancelled
            return null
          }

          let changed = false

          switch (change.type) {
            case "update": {
              const oldValue = array[change.index]
              changed = oldValue !== change.newValue
              if (changed) {
                detachAsChildNode(oldValue)
                attachAsChildNode(change.newValue, "" + change.index, (n) => {
                  change.newValue = n
                })
              }
              break
            }

            case "splice": {
              for (let i = 0; i < change.removedCount; i++) {
                const removedValue = array[change.index + i]
                detachAsChildNode(removedValue)
              }

              for (let i = 0; i < change.added.length; i++) {
                attachAsChildNode(change.added[i], "" + (change.index + i), (n) => {
                  change.added[i] = n
                })
              }

              changed = change.removedCount > 0 || change.added.length > 0

              // we might also need to update the parent of the next indexes
              const oldNextIndex = change.index + change.removedCount
              const newNextIndex = change.index + change.added.length

              if (oldNextIndex !== newNextIndex) {
                for (let i = oldNextIndex, j = newNextIndex; i < array.length; i++, j++) {
                  const value = array[i]
                  if (isPrimitive(value)) {
                    continue
                  }
                  if (!isNode(value)) {
                    throw failure("node expected")
                  }
                  setParentNode(
                    array[i], // value
                    {
                      object: array,
                      path: "" + j,
                    } // parentPath
                  )
                }
              }
              break
            }

            default:
              throw failure(`unsupported change type`)
          }

          if (changed) {
            invalidateSnapshotTreeToRoot(observableStruct)
            return change
          }

          return null
        })

        observe(array, (change) => {
          emitChangeToRoot(array, change)
        })
      } else {
        const object = observableStruct

        intercept(object, (change) => {
          // Emit intercepted change BEFORE processing
          const wrappedChange = emitInterceptedChangeToRoot(object, change)
          if (wrappedChange === null) {
            // Change was cancelled
            return null
          }

          if (typeof change.name === "symbol") {
            throw failure("symbol keys are not supported on a mobx-bonsai node")
          }

          const propKey = "" + change.name

          if (propKey === nodeTypeKey || (keyProp !== undefined && propKey === keyProp)) {
            throw failure(`the property ${change.name} cannot be modified`)
          }

          let changed = false

          switch (change.type) {
            case "add": {
              changed = true
              attachAsChildNode(change.newValue, propKey, (n) => {
                change.newValue = n
              })
              break
            }

            case "update": {
              const oldValue = (object as any)[propKey]
              changed = oldValue !== change.newValue
              if (changed) {
                detachAsChildNode(oldValue)
                attachAsChildNode(change.newValue, propKey, (n) => {
                  change.newValue = n
                })
              }
              break
            }

            case "remove": {
              changed = true
              const oldValue = (object as any)[propKey]
              detachAsChildNode(oldValue)
              break
            }

            default:
              throw failure(`unsupported change type`)
          }

          if (changed) {
            invalidateSnapshotTreeToRoot(observableStruct)
            return change
          }

          return null
        })

        observe(observableStruct, (change) => {
          emitChangeToRoot(observableStruct, change)
        })
      }
    }

    // init node if needed
    const skipInit = options?.skipInit ?? false
    if (!skipInit) {
      type?._initNode(nodeStruct as NodeWithAnyType)
    }

    return nodeStruct as unknown as T
  }
)
