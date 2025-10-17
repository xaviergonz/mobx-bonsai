// mobx-bonsai core
export { MobxBonsaiError } from "./error/MobxBonsaiError"
// node
export { clone } from "./node/clone"
export { computedProp } from "./node/computedProp"
export { type Context, createContext } from "./node/context"
export {
  assertIsNode,
  isFrozenNode,
  isNode,
  type NodeChange,
  type NodeChangeListener,
  node,
  onDeepChange,
} from "./node/node"
// node/nodeTypeKey
export type { BaseNodeType } from "./node/nodeTypeKey/BaseNodeType"
export type { NodeForNodeType } from "./node/nodeTypeKey/NodeForNodeType"
export {
  type AnyNodeType,
  type AnyTypedNodeType,
  type AnyUntypedNodeType,
  findNodeTypeById,
  getNodeTypeAndKey,
  getNodeTypeId,
  type NodeKeyValue,
  type NodeTypeKey,
  type NodeTypeValue,
  type NodeWithAnyType,
  nodeType,
  nodeTypeKey,
  onInit,
  type TNode,
} from "./node/nodeTypeKey/nodeType"
export type { TypedNodeType } from "./node/nodeTypeKey/TypedNodeType"
export type { UntypedNodeType } from "./node/nodeTypeKey/UntypedNodeType"
// node/snapshot
export { applySnapshot } from "./node/snapshot/applySnapshot"
export { getSnapshot } from "./node/snapshot/getSnapshot"
export { type OnSnapshotListener, onSnapshot } from "./node/snapshot/onSnapshot"
export { substituteNodeKeys } from "./node/substituteNodeKeys"
export type { FoundParentPath } from "./node/tree/FoundParentPath"
// node/tree
export { findChildren } from "./node/tree/findChildren"
export { findParent } from "./node/tree/findParent"
export { findParentPath } from "./node/tree/findParentPath"
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
export type { RootPath } from "./node/tree/RootPath"
export { resolvePath } from "./node/tree/resolvePath"
export { WalkTreeMode, walkTree } from "./node/tree/walkTree"
export type { NodeKeyGenerator } from "./node/utils/nodeKeyGenerator"
export { type VolatileProp, volatileProp } from "./node/volatileProp"

// plainTypes
export type { Primitive } from "./plainTypes/types"
export { connectReduxDevTools } from "./redux/connectReduxDevTools"
// redux
export { asReduxStore, type ReduxStore } from "./redux/redux"

// transforms
export { arrayToSetTransform } from "./transforms/arrayToSetTransform"
export { asMap } from "./transforms/asMap"
export { asSet } from "./transforms/asSet"
export { bigIntToStringTransform } from "./transforms/bigIntToStringTransform"
export { dateToIsoStringTransform } from "./transforms/dateToIsoStringTransform"
export { dateToTimestampTransform } from "./transforms/dateToTimestampTransform"
export { ImmutableDate } from "./transforms/ImmutableDate"
export { isoStringToDateTransform } from "./transforms/isoStringToDateTransform"
export { objectToMapTransform } from "./transforms/objectToMapTransform"
export { stringToBigIntTransform } from "./transforms/stringToBigIntTransform"
export { timestampToDateTransform } from "./transforms/timestampToDateTransform"

// utils
export { deepEquals } from "./utils/deepEquals"

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
