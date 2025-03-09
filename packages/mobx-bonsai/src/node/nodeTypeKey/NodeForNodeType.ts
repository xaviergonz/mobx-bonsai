import { BaseNodeType } from "./BaseNodeType"

/**
 * Extracts the node type from a NodeType instance
 *
 * @template T - A NodeType instance
 */
export type NodeForNodeType<T extends BaseNodeType<any, any, any, any, any>> =
  T extends BaseNodeType<infer TNode, any, any, any, any> ? TNode : never
