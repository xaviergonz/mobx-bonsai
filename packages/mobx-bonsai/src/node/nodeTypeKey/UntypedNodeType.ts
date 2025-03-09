import { BaseNodeType } from "./BaseNodeType"

/**
 * A type that represents an untyped node type in the mobx-bonsai tree.
 *
 * @template TNode - The object type that represents the node's data structure.
 */
export type UntypedNodeType<TNode extends object> = BaseNodeType<
  TNode,
  "untyped",
  never,
  never,
  unknown
>
