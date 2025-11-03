import { remove, set } from "mobx"
import { failure } from "../error/failure"
import { isArray, isMap, isPrimitive, isSet } from "../plainTypes/checks"
import { getNodeTypeAndKey } from "./nodeTypeKey/nodeType"

function setIfDifferent(target: any, key: PropertyKey, value: unknown) {
  if (target[key] !== value || !(key in target)) {
    set(target, key, value)
  }
}

export function reconcileData<T>(oldValue: any, newValue: T, reconciliationRoot: object): T {
  if (oldValue === newValue) {
    // same value, no need to reconcile
    return oldValue
  }

  if (isPrimitive(newValue) || isPrimitive(oldValue)) {
    // one of them a primitive and the other is not, no reconciliation possible
    return newValue
  }

  // both an object or array, with oldValue being a node

  const oldIsArray = isArray(oldValue)
  const newIsArray = isArray(newValue)

  if (oldIsArray !== newIsArray) {
    // different types, no reconciliation possible
    return newValue
  }

  if (newIsArray) {
    // both arrays
    const oldArray = oldValue as any[]
    const newArray = newValue as any[]

    // remove excess items
    if (oldArray.length > newArray.length) {
      oldArray.splice(newArray.length, oldArray.length - newArray.length)
    }

    // reconcile present items
    for (let i = 0; i < oldArray.length; i++) {
      const oldV = oldArray[i]
      const newV = reconcileData(oldV, newArray[i], reconciliationRoot)

      setIfDifferent(oldArray, i, newV)
    }

    // add excess items
    for (let i = oldArray.length; i < newArray.length; i++) {
      oldArray.push(reconcileData(undefined, newArray[i], reconciliationRoot))
    }

    return oldArray as T
  } else if (isMap(newValue)) {
    throw failure("a value must not contain maps")
  } else if (isSet(newValue)) {
    throw failure("a value must not contain sets")
  } else {
    // both objects
    const oldObject = oldValue as any
    const newObject = newValue as any

    // nodes of a different type or key shouldn't be reconciled
    const newNodeTypeAndKey = getNodeTypeAndKey(newObject)
    const oldNodeTypeAndKey = getNodeTypeAndKey(oldObject)
    if (
      newNodeTypeAndKey.type !== oldNodeTypeAndKey.type ||
      newNodeTypeAndKey.key !== oldNodeTypeAndKey.key
    ) {
      return newValue
    }

    // frozen nodes should not be reconciled (unless they are the same ref, which is covered by the first check)
    if (newNodeTypeAndKey.type?.isFrozen || oldNodeTypeAndKey.type?.isFrozen) {
      return newValue
    }

    // remove excess props
    const oldObjectKeys = Object.keys(oldObject)
    const oldObjectKeysLen = oldObjectKeys.length
    for (let i = 0; i < oldObjectKeysLen; i++) {
      const k = oldObjectKeys[i]
      if (!(k in newObject)) {
        remove(oldObject, k)
      }
    }

    // reconcile the rest
    const newObjectKeys = Object.keys(newObject)
    const newObjectKeysLen = newObjectKeys.length
    for (let i = 0; i < newObjectKeysLen; i++) {
      const k = newObjectKeys[i]
      const v = newObject[k]

      const oldV = oldObject[k]
      const newV = reconcileData(oldV, v, reconciliationRoot)

      setIfDifferent(oldObject, k, newV)
    }

    return oldObject as T
  }
}
