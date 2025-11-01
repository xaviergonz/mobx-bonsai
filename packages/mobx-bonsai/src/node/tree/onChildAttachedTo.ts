import { action, reaction, runInAction } from "mobx"
import { assertIsFunction } from "../../plainTypes/checks"
import { disposeOnce } from "../../utils/disposable"
import { assertIsNode } from "../node"
import { NodeForNodeType } from "../nodeTypeKey/NodeForNodeType"
import { AnyTypedNodeType, getNodeTypeAndKey } from "../nodeTypeKey/nodeType"
import { getChildrenNodes } from "./getChildrenNodes"

/**
 * Represents a disposer function to clean up resources after a child node is attached to a parent.
 *
 * @param runDetachDisposers - When true, detach disposers for the child node will be executed during disposal.
 */
export type OnChildAttachedToDisposer = (runDetachDisposers: boolean) => void

/**
 * Parameters for the onChildAttachedTo function.
 *
 * @template TChildNodeType - The type of the node to watch for.
 * @template TChild - The type of the child node that will be attached.
 *
 * @property target - A function that returns the target object to watch for child attachments.
 * @property childNodeType - The type of node to watch for when being attached.
 * @property onChildAttached - Callback executed when a child is attached.
 *   Should return either a cleanup function or void.
 * @property - If true, watches for children attached at any level of the tree. If false, only
 *   watches for direct children. Defaults to false.
 * @property - If true, the callback will be executed for all matching children that are already
 *   attached. Defaults to false.
 */
export type OnChildAttachedToParams<TChildNodeType, TChild> = {
  target: () => object
  childNodeType: TChildNodeType
  onChildAttached: (child: TChild) => (() => void) | void
  deep?: boolean
  fireForCurrentChildren?: boolean
}

export function onChildAttachedTo<const NT extends readonly AnyTypedNodeType[]>(
  params: OnChildAttachedToParams<NT, NodeForNodeType<NT[number]>>
): OnChildAttachedToDisposer

export function onChildAttachedTo<const NT extends AnyTypedNodeType>(
  params: OnChildAttachedToParams<NT, NodeForNodeType<NT>>
): OnChildAttachedToDisposer

export function onChildAttachedTo<T extends object = object>(
  params: OnChildAttachedToParams<undefined, T>
): OnChildAttachedToDisposer

/**
 * Runs a callback everytime a new node is attached to a given node.
 * The callback can optionally return a disposer which will be run when the child is detached.
 *
 * @param target Function that returns the node whose children should be tracked.
 * @param childNodeType The node type (or array of types) for which it should be invoked, or undefined if it should be invoked for them all.
 * @param onChildAttached Callback called when a child is attached to the target node.
 * @param deep (default: `false`) Whether to run the callback for all children deeply or only for shallow children.
 * @param fireForCurrentChildren (default: `true`) Whether to immediately call the callback for already attached children.
 * @returns A disposer function. Pass `true` to run the detach disposers for children that had the attach event fired.
 */
export function onChildAttachedTo<T extends object = object>({
  target,
  childNodeType,
  onChildAttached,
  deep,
  fireForCurrentChildren,
}: OnChildAttachedToParams<
  AnyTypedNodeType | readonly AnyTypedNodeType[] | undefined,
  T
>): OnChildAttachedToDisposer {
  assertIsFunction(target, "target")
  assertIsFunction(onChildAttached, "onChildAttached")

  deep ??= false
  fireForCurrentChildren ??= true

  const convertToChildNodeTypeSet = () => {
    if (!childNodeType) {
      return undefined
    }
    return new Set(Array.isArray(childNodeType) ? childNodeType : [childNodeType])
  }
  const childNodeTypeSet = convertToChildNodeTypeSet()

  const detachDisposers = new WeakMap<object, () => void>()

  const runDetachDisposer = (n: object) => {
    const detachDisposer = detachDisposers.get(n)
    if (detachDisposer) {
      detachDisposers.delete(n)
      detachDisposer()
    }
  }

  const addDetachDisposer = (n: object, disposer: (() => void) | void) => {
    if (disposer) {
      detachDisposers.set(n, action(disposer))
    }
  }

  const getChildrenObjectOpts = { deep }
  const getCurrentChildren = () => {
    const t = target()
    assertIsNode(t, "target()")

    const children = getChildrenNodes(t, getChildrenObjectOpts)

    const set = new Set<object>()

    const iter = children.values()
    let cur = iter.next()
    while (!cur.done) {
      set.add(cur.value)
      cur = iter.next()
    }

    return set
  }

  const currentChildren = fireForCurrentChildren ? new Set<object>() : getCurrentChildren()

  const disposeReaction = reaction(
    () => getCurrentChildren(),
    (newChildren) => {
      const disposersToRun: object[] = []

      // find dead
      const currentChildrenIter = currentChildren.values()
      let currentChildrenCur = currentChildrenIter.next()
      while (!currentChildrenCur.done) {
        const n = currentChildrenCur.value
        if (!newChildren.has(n)) {
          currentChildren.delete(n)

          // we should run it in inverse order
          disposersToRun.push(n)
        }

        currentChildrenCur = currentChildrenIter.next()
      }

      if (disposersToRun.length > 0) {
        for (let i = disposersToRun.length - 1; i >= 0; i--) {
          runDetachDisposer(disposersToRun[i])
        }
      }

      // find new
      const newChildrenIter = newChildren.values()
      let newChildrenCur = newChildrenIter.next()
      while (!newChildrenCur.done) {
        const n = newChildrenCur.value
        if (!currentChildren.has(n)) {
          currentChildren.add(n)

          runInAction(() => {
            const { type } = getNodeTypeAndKey(n)
            if (!childNodeTypeSet || childNodeTypeSet.has(type)) {
              const detachAction = onChildAttached(n as T)
              addDetachDisposer(n, detachAction)
            }
          })
        }

        newChildrenCur = newChildrenIter.next()
      }
    },
    {
      fireImmediately: true,
    }
  )

  return disposeOnce((runDetachDisposers: boolean) => {
    disposeReaction()

    if (runDetachDisposers) {
      const currentChildrenIter = currentChildren.values()
      let currentChildrenCur = currentChildrenIter.next()
      while (!currentChildrenCur.done) {
        const n = currentChildrenCur.value
        runDetachDisposer(n)

        currentChildrenCur = currentChildrenIter.next()
      }
    }
    currentChildren.clear()
  })
}
