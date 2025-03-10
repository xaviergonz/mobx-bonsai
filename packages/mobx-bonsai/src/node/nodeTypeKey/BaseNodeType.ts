import { MarkOptional } from "ts-essentials"
import { IComputedValueOptions } from "mobx"
import { PrependArgument } from "../../utils/PrependArgument"
import { nodeTypeKey, NodeTypeKey, NodeTypeValue } from "./nodeType"
import { DisposableDispose } from "../../utils/disposable"

/**
 * Base interface for node types with type-specific capabilities.
 *
 * @template TNode - The object type representing a node
 * @template TCapabilities - Node type capabilities, can be "typed" and/or "keyed"
 * @template TOptional - Optional properties of the node type
 * @template TKey - Property key used for node identification (if keyed)
 * @template TOther - Additional type information
 */
interface BaseNodeTypeWithType<
  TNode extends object,
  TCapabilities extends "typed" | "keyed",
  TOptional extends keyof TNode,
  TKey extends keyof TNode | never,
  TOther,
> {
  /**
   * Unique identifier for this node type
   */
  typeId: TNode extends {
    [nodeTypeKey]: NodeTypeValue
  }
    ? TNode[NodeTypeKey]
    : undefined

  /**
   * Checks if the node is of a specific type
   *
   * @param node - Node to check
   * @returns true if the node type matches, false otherwise
   */
  nodeIsOfType(node: object): node is TNode

  /**
   * Unregisters this node type
   */
  unregister(): void

  /**
   * Unregisters this node type (disposable pattern)
   */
  [Symbol.dispose](): void

  /**
   * Registers a callback to run when nodes of this type are initialized
   *
   * @param callback - Function to execute when a node is initialized
   *
   * @returns The same node type with the added initialization callback
   */
  onInit(
    callback: (node: TNode) => void
  ): BaseNodeType<TNode, TCapabilities, TOptional, TKey, TOther>

  _initNode(node: TNode): void

  _addOnInit(callback: (node: TNode) => void): DisposableDispose

  /**
   * Configures this type to use a specific property as the node key
   *
   * @template TKey - Property key in the node type
   * @param key - Property name to use as the node key
   * @returns A keyed node type using the specified property as key
   */
  withKey<TKey extends keyof TNode>(
    key: TKey
  ): BaseNodeType<TNode, TCapabilities | "keyed", TOptional, TKey, TOther>

  /**
   * Makes this node type immutable.
   *
   * Immutable nodes cannot be modified after creation and sub-objects are not turned into nodes.
   * This is useful for creating read-only nodes or for performance optimizations.
   */
  frozen(): BaseNodeType<TNode, TCapabilities, TOptional, TKey, TOther>

  /**
   * true if the node type is frozen, false otherwise
   */
  isFrozen: boolean
}

/**
 * Interface that represents a node type with a key property.
 * Provides functionality for accessing and finding nodes by their unique keys.
 *
 * @template TNode - The node type
 * @template TKey - The key of the node's unique identifier property
 */
interface BaseNodeTypeWithKey<TNode, TKey extends keyof TNode> {
  /**
   * Property name containing the node's unique key
   */
  key: TKey

  /**
   * Gets the unique key value for a node
   *
   * @param node - Node to get the key from
   * @returns The node's key value or undefined
   */
  getKey(node: TNode): TNode[TKey] | undefined

  /**
   * Retrieves a node by its key (if it exists)
   *
   * @param key - Key to search for
   * @returns The node with the specified key or undefined
   */
  findByKey(key: TNode[TKey]): TNode | undefined
}

/**
 * Base node type definition with core functionality
 *
 * @template TNode - Node structure that adheres to this type
 * @template TOptional - Optional keys in the node structure
 * @template TCapabilities - Type of capabilities (untyped, typed or keyed)
 * @template TKey - Key field in the node structure (if any)
 * @template TOther - Additional properties and methods
 */
export type BaseNodeType<
  TNode extends object,
  TCapabilities extends "untyped" | "typed" | "keyed",
  TOptional extends keyof TNode,
  TKey extends keyof TNode | never,
  TOther,
> = {
  /**
   * Node constructor.
   * Requires all keys from TNode except those in TOptional (which may be omitted).
   */
  (data: MarkOptional<TNode, TOptional | TKey>): TNode

  /**
   * Returns a snapshot based on the provided data.
   */
  snapshot(data: MarkOptional<TNode, TOptional | TKey>): TNode

  /**
   * Adds volatile state properties to nodes of this type
   *
   * Volatile state is not persisted in snapshots and is local to each node instance.
   *
   * @template TVolatiles - Record of volatile property getter functions
   * @param volatile - Object where each key defines a getter function for volatile state
   * @returns The same NodeType with added accessor methods for the volatile state
   */
  volatile<TVolatiles extends Record<string, () => any>>(
    volatile: TVolatiles
  ): BaseNodeType<
    TNode,
    TCapabilities,
    TOptional,
    TKey,
    TOther & VolatileAccessors<TVolatiles, TNode>
  >

  /**
   * Registers action methods for nodes of this type
   *
   * Actions are methods that can modify the node state and are automatically
   * wrapped in MobX actions for proper state tracking.
   *
   * @template TActions - Record of action methods
   *
   * @param actions - An object of action methods
   *
   * @returns The same NodeType with added action methods that accept a node as their first parameter
   */
  actions<TActions extends Record<string, (this: TNode, ...args: any) => any>>(
    actions: TActions
  ): BaseNodeType<
    TNode,
    TCapabilities,
    TOptional,
    TKey,
    TOther & {
      [k in keyof TActions]: PrependArgument<TActions[k], TNode>
    }
  >

  /**
   * Registers getter methods for nodes of this type
   *
   * Getters are methods that derive values from the node state without modifying it.
   *
   * @template TGetters - Record of getter methods
   *
   * @param getters - An object of getter methods
   *
   * @returns The same NodeType with added getter methods that accept a node as their first parameter
   */
  getters<TGetters extends Record<string, (this: TNode, ...args: any) => any>>(
    getters: TGetters
  ): BaseNodeType<
    TNode,
    TCapabilities,
    TOptional,
    TKey,
    TOther & {
      [k in keyof TGetters]: PrependArgument<TGetters[k], TNode>
    }
  >

  /**
   * Registers computed methods for nodes of this type
   *
   * Computed methods derive values from the node state and are automatically
   * memoized by MobX for performance optimization.
   *
   * @template TComputeds - Record of computed properties
   * @param computeds - Function that receives a node and returns an object of computed accessor methods
   * @returns The same NodeType with added computed methods that accept a node as their first parameter
   */
  computeds<TComputeds extends Record<string, ComputedEntry<TNode, any>>>(
    computeds: TComputeds
  ): BaseNodeType<
    TNode,
    TCapabilities,
    TOptional,
    TKey,
    TOther & {
      [k in keyof TComputeds]: TComputeds[k] extends () => any
        ? PrependArgument<TComputeds[k], TNode>
        : TComputeds[k] extends ComputedFnWithOptions<TNode, any>
          ? PrependArgument<TComputeds[k]["get"], TNode>
          : never
    }
  >

  /**
   * Generates setter methods for specified properties
   *
   * @param properties - Names of properties to create setters for
   * @returns The same NodeType with added setter methods
   */
  settersFor<K extends keyof TNode & string>(
    ...properties: readonly K[]
  ): BaseNodeType<
    TNode,
    TCapabilities,
    TOptional,
    TKey,
    TOther & {
      [P in K as `set${Capitalize<P>}`]: (node: TNode, value: Readonly<TNode[P]>) => void
    }
  >

  /**
   * Define default values for keys in TOptional.
   * When omitted, those properties are filled with the results of these generators.
   *
   * @template TGen - Record of default value generators
   */
  defaults<TGen extends { [K in keyof TNode]?: () => TNode[K] }>(
    defaultGenerators: TGen
  ): BaseNodeType<TNode, TCapabilities, TOptional | (keyof TGen & keyof TNode), TKey, TOther>

  /**
   * Default generators defined so far.
   */
  defaultGenerators?: { [K in keyof TNode]?: () => TNode[K] }
} & (TCapabilities extends "typed" | "keyed" // is it a typed node?
  ? BaseNodeTypeWithType<TNode, TCapabilities, TOptional, TKey, TOther> &
      (TCapabilities extends "keyed" // is it a keyed node?
        ? BaseNodeTypeWithKey<TNode, TKey>
        : unknown)
  : unknown) &
  TOther

/**
 * Configuration for a computed property with options
 *
 * @template TThis - This type for the computed function
 * @template T - Return type of the computed value
 */
export type ComputedFnWithOptions<TThis, T> = { get: (this: TThis) => T } & Omit<
  IComputedValueOptions<T>,
  "get" | "set"
>

/**
 * Computed property definition that can be a function or configuration object
 *
 * @template TThis - This type for the computed function
 * @template T - Return type of the computed value
 */
export type ComputedEntry<TThis, T> = ((this: TThis) => T) | ComputedFnWithOptions<TThis, T>

/**
 * Generates accessor methods for volatile properties
 *
 * @template T - Record of volatile property getter functions
 * @template TNode - The node type these accessors operate on
 */
export type VolatileAccessors<T extends Record<string, () => any>, TNode> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (n: TNode, value: ReturnType<T[K]>) => void
} & {
  [K in keyof T as `get${Capitalize<string & K>}`]: (n: TNode) => ReturnType<T[K]>
} & {
  [K in keyof T as `reset${Capitalize<string & K>}`]: (n: TNode) => void
}
