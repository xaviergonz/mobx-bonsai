// biome-ignore-all assist/source/organizeImports: explicit export organization

// mobx-bonsai core
export { MobxBonsaiError } from "./error/MobxBonsaiError"

// node/nodeTypeKey
export type { BaseNodeType } from "./node/nodeTypeKey/BaseNodeType"
export type { NodeForNodeType } from "./node/nodeTypeKey/NodeForNodeType"
export {
  findNodeTypeById,
  getNodeTypeAndKey,
  getNodeTypeId,
  nodeType,
  nodeTypeKey,
  onInit,
  type AnyNodeType,
  type AnyTypedNodeType,
  type AnyUntypedNodeType,
  type NodeTypeKey,
  type NodeKeyValue,
  type NodeTypeValue,
  type NodeWithAnyType,
  type TNode,
} from "./node/nodeTypeKey/nodeType"
export type { TypedNodeType } from "./node/nodeTypeKey/TypedNodeType"
export type { UntypedNodeType } from "./node/nodeTypeKey/UntypedNodeType"

// node/tree
export { findChildren } from "./node/tree/findChildren"
export { findParent } from "./node/tree/findParent"
export { findParentPath } from "./node/tree/findParentPath"
export type { FoundParentPath } from "./node/tree/FoundParentPath"
export { getChildrenNodes } from "./node/tree/getChildrenNodes"
export { getParent } from "./node/tree/getParent"
export { getParentPath } from "./node/tree/getParentPath"
export { getParentToChildPath } from "./node/tree/getParentToChildPath"
export { getRoot } from "./node/tree/getRoot"
export { getRootPath } from "./node/tree/getRootPath"
export { isChildOfParent } from "./node/tree/isChildOfParent"
export { isParentOfChild } from "./node/tree/isParentOfChild"
export { isRoot } from "./node/tree/isRoot"
export { onChildAttachedTo } from "./node/tree/onChildAttachedTo"
export type { ParentPath } from "./node/tree/ParentPath"
export type { Path, PathElement, WritablePath } from "./node/tree/pathTypes"
export { resolvePath } from "./node/tree/resolvePath"
export type { RootPath } from "./node/tree/RootPath"
export { walkTree, WalkTreeMode } from "./node/tree/walkTree"

// node/snapshot
export { applySnapshot } from "./node/snapshot/applySnapshot"
export { getSnapshot } from "./node/snapshot/getSnapshot"
export { onSnapshot, type OnSnapshotListener } from "./node/snapshot/onSnapshot"

// node
export { clone } from "./node/clone"
export { computedProp } from "./node/computedProp"
export { type Context, createContext } from "./node/context"
export {
  assertIsNode,
  isNode,
  isFrozenNode,
  node,
  onDeepChange,
  type NodeChange,
  type NodeChangeListener,
} from "./node/node"
export { substituteNodeKeys } from "./node/substituteNodeKeys"
export type { NodeKeyGenerator } from "./node/utils/nodeKeyGenerator"
export { volatileProp, type VolatileProp } from "./node/volatileProp"

// plainTypes
export type { Primitive } from "./plainTypes/types"

// redux
export { asReduxStore, type ReduxStore } from "./redux/redux"
export { connectReduxDevTools } from "./redux/connectReduxDevTools"

// transforms
export { arrayToSetTransform } from "./transforms/arrayToSetTransform"
export { objectToMapTransform } from "./transforms/objectToMapTransform"
export { timestampToDateTransform } from "./transforms/timestampToDateTransform"
export { dateToTimestampTransform } from "./transforms/dateToTimestampTransform"
export { isoStringToDateTransform } from "./transforms/isoStringToDateTransform"
export { dateToIsoStringTransform } from "./transforms/dateToIsoStringTransform"
export { stringToBigIntTransform } from "./transforms/stringToBigIntTransform"
export { bigIntToStringTransform } from "./transforms/bigIntToStringTransform"
export { asMap } from "./transforms/asMap"
export { asSet } from "./transforms/asSet"
export { ImmutableDate } from "./transforms/ImmutableDate"

// utils
export { deepEquals } from "./utils/deepEquals"

// polyfills
;(Symbol as any).dispose ??= Symbol("Symbol.dispose")

// internal utils for mobx-bonsai packages
export type { Dispose as _Dispose } from "./utils/disposable"
export { disposeOnce as _disposeOnce } from "./utils/disposable"
export type { Primitive as _Primitive } from "./plainTypes/types"
export {
  isArray as _isArray,
  isPlainObject as _isPlainObject,
  isPrimitive as _isPrimitive,
} from "./plainTypes/checks"
export { buildNodeFullPath as _buildNodeFullPath } from "./node/utils/buildNodeFullPath"
export { runDetachingDuplicatedNodes as _runDetachingDuplicatedNodes } from "./node/node"

// polyfills
;(Symbol as any).dispose ??= Symbol("Symbol.dispose")
