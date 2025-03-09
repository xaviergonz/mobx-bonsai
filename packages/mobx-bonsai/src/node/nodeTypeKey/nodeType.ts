import mitt from "mitt"
import { IComputedValue, action, computed } from "mobx"
import { failure } from "../../error/failure"
import { getGlobalConfig } from "../../globalConfig"
import { disposeOnce, makeDisposable } from "../../utils/disposable"
import { assertIsNode, isNode, node } from "../node"
import { volatileProp } from "../volatileProp"
import { BaseNodeType } from "./BaseNodeType"
import { TypedNodeType } from "./TypedNodeType"
import { UntypedNodeType } from "./UntypedNodeType"

/**
 * Property key used to identify a node's type
 */
export const nodeTypeKey = "$$type"

/**
 * Type of the nodeTypeKey constant
 */
export type NodeTypeKey = typeof nodeTypeKey

/**
 * Value that identifies a node's type (string or number)
 */
export type NodeTypeValue = string | number

/**
 * Value that uniquely identifies a node instance (string or number)
 */
export type NodeKeyValue = string | number

/**
 * Represents any node that has a type designation
 */
export interface NodeWithAnyType {
  readonly [nodeTypeKey]: NodeTypeValue
}

/**
 * Combines a specific node type with additional data properties
 *
 * @template TType - The node's type identifier
 * @template TData - Additional data properties for the node
 */
export type TNode<TType extends NodeTypeValue, TData> = {
  readonly [nodeTypeKey]: TType
} & TData

const nodeByTypeAndKey = new Map<NodeTypeValue, Map<NodeKeyValue, WeakRef<object>>>()

const finalizationRegistry = new FinalizationRegistry(
  ({
    typeId,
    key,
  }: {
    typeId: NodeTypeValue
    key: NodeKeyValue
  }) => {
    const typeMap = nodeByTypeAndKey.get(typeId)
    if (!typeMap) {
      // already gone
      return
    }

    const ref = typeMap.get(key)
    if (!ref) {
      // already gone
      return
    }

    if (ref.deref()) {
      // still alive
      return
    }

    // dead and should be removed
    typeMap.delete(key)
    if (typeMap.size === 0) {
      nodeByTypeAndKey.delete(typeId)
    }
  }
)

/**
 * Attempts to register a node in the type/key registry
 *
 * @param node - The node to register
 * @returns True if registration was successful
 */
export function tryRegisterNodeByTypeAndKey(node: object): boolean {
  assertIsNode(node, "node")

  const { type, key } = getNodeTypeAndKey(node)
  if (type === undefined || key === undefined) {
    return false
  }
  const { typeId } = type

  let typeMap = nodeByTypeAndKey.get(typeId)
  if (!typeMap) {
    typeMap = new Map()
    nodeByTypeAndKey.set(typeId, typeMap)
  }

  typeMap.set(key, new WeakRef(node))
  finalizationRegistry.register(node, { typeId, key })

  return true
}

/**
 * A type representing any untyped node type.
 */
export type AnyUntypedNodeType = BaseNodeType<any, "untyped", any, any, unknown>

/**
 * Union of all possible typed node type objects
 */
export type AnyTypedNodeType = BaseNodeType<any, "typed" | "keyed", any, any, unknown>

/**
 * Union of all possible node type objects
 */
export type AnyNodeType = AnyUntypedNodeType | AnyTypedNodeType

const registeredNodeTypes = new Map<NodeTypeValue, AnyTypedNodeType>()

/**
 * Retrieves the registered node type for a given type ID
 *
 * @param typeId - The node type identifier to look up
 * @returns The node type object or undefined if not found
 */
export function findNodeTypeById(typeId: NodeTypeValue): AnyTypedNodeType | undefined {
  return registeredNodeTypes.get(typeId)
}

export function getNodeTypeId<TNode extends NodeWithAnyType>(node: TNode): TNode[NodeTypeKey]
export function getNodeTypeId(node: object): NodeTypeValue | undefined

/**
 * Gets the type identifier of a node
 *
 * @param node - The node to get the type from
 * @returns The node's type identifier or undefined
 */
export function getNodeTypeId(node: object): NodeTypeValue | undefined {
  return (node as any)[nodeTypeKey]
}

export function getNodeTypeAndKey<TNode extends NodeWithAnyType>(
  node: TNode
): {
  type: AnyTypedNodeType
  key: NodeKeyValue | undefined
}
export function getNodeTypeAndKey(node: object): {
  type: AnyTypedNodeType | undefined
  key: NodeKeyValue | undefined
}

/**
 * Gets both the type object and key value for a node
 *
 * @param node - The node to extract type and key from
 * @returns Object containing the node's type and key
 */
export function getNodeTypeAndKey(node: object): {
  type: AnyTypedNodeType | undefined
  key: NodeKeyValue | undefined
} {
  const typeValue = getNodeTypeId(node)
  if (typeValue === undefined) {
    return {
      type: undefined,
      key: undefined,
    }
  }

  const type = findNodeTypeById(typeValue)
  if (type === undefined) {
    throw failure(`a node with type '${typeValue}' was found, but such type is not registered`)
  }

  return {
    type,
    key: "getKey" in type ? type.getKey(node as NodeWithAnyType) : undefined,
  }
}

export function nodeType<TNode extends NodeWithAnyType = never>(
  type: TNode[NodeTypeKey]
): TypedNodeType<TNode>
export function nodeType<TNode extends object = never>(): UntypedNodeType<TNode>

/**
 * Creates and registers a new node type
 *
 * @template TNode - The node structure that will adhere to this type
 * @param type - Unique identifier for this node type
 * @returns A typed node factory with associated methods
 */
export function nodeType<TNode extends object = never>(
  type?: TNode extends NodeWithAnyType ? TNode[NodeTypeKey] : never
): TNode extends NodeWithAnyType ? TypedNodeType<TNode> : UntypedNodeType<TNode> {
  return (type !== undefined ? typedNodeType<NodeWithAnyType>(type) : untypedNodeType()) as any
}

/**
 * Adds extension methods (volatile, actions, getters, computeds) to a node type object
 *
 * @param nodeTypeObj - The node type object to extend
 */
function addNodeTypeExtensionMethods<TNode extends object>(
  nodeTypeObj: Partial<BaseNodeType<TNode, any, any, any, unknown>>
): void {
  nodeTypeObj.volatile = (volatiles) => {
    const result = nodeTypeObj as any

    for (const volatileKey of Object.keys(volatiles)) {
      const defaultValueGen = volatiles[volatileKey]
      const [getter, setter, resetter] = volatileProp(defaultValueGen)

      const capitalizedVolatileKey = volatileKey.charAt(0).toUpperCase() + volatileKey.slice(1)
      result[`get${capitalizedVolatileKey}`] = getter
      result[`set${capitalizedVolatileKey}`] = setter
      result[`reset${capitalizedVolatileKey}`] = resetter
    }

    return nodeTypeObj as any
  }

  nodeTypeObj.actions = (actions) => {
    const result = nodeTypeObj as any

    for (const key of Object.keys(actions)) {
      result[key] = action((n: TNode, ...args: any[]) => actions[key].apply(n, args))
    }

    return nodeTypeObj as any
  }

  nodeTypeObj.getters = (getters) => {
    const result = nodeTypeObj as any

    for (const key of Object.keys(getters)) {
      result[key] = (n: TNode, ...args: any[]) => getters[key].apply(n, args)
    }

    return nodeTypeObj as any
  }

  nodeTypeObj.computeds = (computeds) => {
    const result = nodeTypeObj as any

    const cachedComputedsByNode = new WeakMap<object, Map<string, IComputedValue<unknown>>>()

    function getOrCreateNodeCachedComputed(n: TNode, key: string) {
      let nodeCachedComputeds = cachedComputedsByNode.get(n)
      if (!nodeCachedComputeds) {
        nodeCachedComputeds = new Map()
        cachedComputedsByNode.set(n, nodeCachedComputeds)
      }

      let cachedComputed = nodeCachedComputeds.get(key)
      if (!cachedComputed) {
        const value = computeds[key]
        if (typeof value === "function") {
          cachedComputed = computed(() => value.call(n))
        } else if (typeof value === "object" && "get" in value && typeof value.get === "function") {
          const options = { ...value, get: undefined }
          cachedComputed = computed(() => value.get.call(n), options)
        } else {
          throw failure(
            `computed property '${key}' must be a function or a configuration object with a 'get' method`
          )
        }

        nodeCachedComputeds.set(key, cachedComputed)
      }

      return cachedComputed
    }

    for (const key of Object.keys(computeds)) {
      result[key] = (n: TNode) => getOrCreateNodeCachedComputed(n, key).get()
    }

    return nodeTypeObj as any
  }

  nodeTypeObj.settersFor = (...properties) => {
    const result = nodeTypeObj as any

    for (const prop of properties) {
      const capitalizedProp = prop.charAt(0).toUpperCase() + prop.slice(1)
      const setterName = `set${capitalizedProp}`

      result[setterName] = action((node: TNode, value: any) => {
        ;(node as any)[prop] = value
      })
    }

    return nodeTypeObj as any
  }

  nodeTypeObj.defaults = (defaultGenerators) => {
    nodeTypeObj.defaultGenerators = {
      ...nodeTypeObj.defaultGenerators,
      ...defaultGenerators,
    }

    return nodeTypeObj as any
  }
}

function applyDefaultGenerators<T>(
  data: T,
  defaultGenerators: { [k in keyof T]?: () => unknown } | undefined
): T {
  if (!defaultGenerators) {
    return data
  }

  if (typeof data !== "object" || data === null) {
    throw failure(`data must be an object`)
  }

  const copy = { ...data }

  for (const [key, gen] of Object.entries(defaultGenerators)) {
    if ((copy as any)[key] === undefined) {
      ;(copy as any)[key] = (gen as () => unknown)()
    }
  }
  return copy
}

function typedNodeType<TNode extends NodeWithAnyType = never>(
  type: TNode[NodeTypeKey]
): TypedNodeType<TNode> {
  if (type && registeredNodeTypes.has(type)) {
    throw failure(`node type '${type}' is already registered`)
  }

  const events = mitt<{
    init: TNode
  }>()

  const snapshot = (data: any) => {
    // apply defaults if provided
    let sn: any = applyDefaultGenerators(data as TNode, nodeTypeObj.defaultGenerators)

    if (data === sn) {
      sn = {
        ...data,
        [nodeTypeKey]: type,
      }
    } else {
      sn[nodeTypeKey] = type
    }

    // generate key if missing
    if (keyedNodeTypeObj.key !== undefined) {
      const key = keyedNodeTypeObj.getKey(sn)
      if (key === undefined) {
        sn[keyedNodeTypeObj.key] = getGlobalConfig().keyGenerator()
      }
    }

    return sn
  }

  const nodeTypeObj: Partial<BaseNodeType<TNode, "typed", keyof TNode, never, unknown>> = (
    data: any
  ) => {
    return node(snapshot(data)) as TNode
  }

  const keyedNodeTypeObj = nodeTypeObj as unknown as BaseNodeType<
    TNode,
    "keyed",
    keyof TNode,
    any,
    unknown
  >

  nodeTypeObj.snapshot = snapshot

  nodeTypeObj.typeId = type as any

  nodeTypeObj.withKey = (key) => {
    if (keyedNodeTypeObj.key !== undefined) {
      throw failure(`node type already has a key`)
    }

    keyedNodeTypeObj.key = key

    keyedNodeTypeObj.getKey = (node) => {
      return keyedNodeTypeObj.key === undefined ? undefined : (node as any)[keyedNodeTypeObj.key]
    }

    keyedNodeTypeObj.findByKey = (key) => {
      const typeMap = nodeByTypeAndKey.get(type)
      if (!typeMap) {
        return undefined
      }

      const ref = typeMap.get(key)

      return ref?.deref() as TNode | undefined
    }

    keyedNodeTypeObj.defaults({
      [key]: () => getGlobalConfig().keyGenerator(),
    } as any)

    return keyedNodeTypeObj as any
  }

  nodeTypeObj.nodeIsOfType = (node: object): node is TNode => {
    return isNode(node) && (node as TNode)[nodeTypeKey] === type
  }

  nodeTypeObj.unregister = disposeOnce(() => {
    registeredNodeTypes.delete(type)
  })

  nodeTypeObj[Symbol.dispose] = () => {
    nodeTypeObj.unregister!()
  }

  nodeTypeObj._addOnInit = (callback) => {
    const actionCallback = action(callback)

    events.on("init", actionCallback)

    return makeDisposable(() => {
      events.off("init", actionCallback)
    })
  }

  nodeTypeObj.onInit = (callback) => {
    nodeTypeObj._addOnInit!(callback)
    return nodeTypeObj as any
  }

  nodeTypeObj._initNode = (node: TNode) => {
    events.emit("init", node)
  }

  addNodeTypeExtensionMethods(nodeTypeObj as any)

  registeredNodeTypes.set(type, nodeTypeObj as AnyTypedNodeType)

  return nodeTypeObj as TypedNodeType<TNode>
}

/**
 * Registers a callback function to be invoked after a node of the specified type is initialized.
 *
 * @template TNode - The type of the node that extends NodeWithAnyType
 *
 * @param nodeType - The typed node type to attach the initialization callback to
 * @param callback - Function to be called with the newly initialized node
 *
 * @returns A disposer function that can be called to unregister the callback
 */
export function onInit<TNode extends NodeWithAnyType>(
  nodeType: TypedNodeType<TNode>,
  callback: (node: TNode) => void
) {
  return nodeType._addOnInit(callback)
}

function untypedNodeType<TNode extends object = never>(): UntypedNodeType<TNode> {
  const snapshot = (data: any) => applyDefaultGenerators(data, nodeTypeObj.defaultGenerators)

  const nodeTypeObj: Partial<UntypedNodeType<TNode>> = (data: any) => node(snapshot(data))

  nodeTypeObj.snapshot = snapshot

  addNodeTypeExtensionMethods(nodeTypeObj as any)

  return nodeTypeObj as UntypedNodeType<TNode>
}
