import { BaseNodeType } from "./BaseNodeType"
import { NodeWithAnyType, NodeTypeKey } from "./nodeType"

/**
 * Represents a node type with associated lifecycle and behavior
 *
 * @template TNode - Node structure that adheres to this type
 */
export type TypedNodeType<TNode extends NodeWithAnyType> = BaseNodeType<
  TNode,
  "typed",
  NodeTypeKey,
  never,
  unknown
>
