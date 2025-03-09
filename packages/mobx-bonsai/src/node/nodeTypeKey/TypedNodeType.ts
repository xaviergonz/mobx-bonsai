import { BaseTypedNodeType } from "./BaseTypedNodeType"
import { NodeWithAnyType, NodeTypeKey } from "./nodeType"
import { KeyedNodeType } from "./KeyedNodeType"

/**
 * Represents a node type with associated lifecycle and behavior
 *
 * @template TNode - Node structure that adheres to this type
 */
export type TypedNodeType<TNode extends NodeWithAnyType> = BaseTypedNodeType<
  TNode,
  NodeTypeKey,
  {
    /**
     * Configures this type to use a specific property as the node key
     *
     * @template TKey - Property key in the node type
     * @param key - Property name to use as the node key
     * @returns A keyed node type using the specified property as key
     */
    withKey<TKey extends keyof TNode>(key: TKey): KeyedNodeType<TNode, NodeTypeKey | TKey>

    /**
     * Checks if the node is of a specific type
     *
     * @param node - Node to check
     * @returns true if the node type matches, false otherwise
     */
    nodeIsOfType(node: object): node is TNode
  }
>
