import { isObservableObject } from "mobx"
import { _isArray, _isPlainObject, _isPrimitive, _Primitive, getNodeTypeAndKey } from "mobx-bonsai"
import * as Y from "yjs"
import { failure } from "../../error/failure"
import { YjsValue } from "../yjsTypes/types"

/**
 * Converts a plain value to a Y.js value.
 * Objects are converted to Y.Maps, arrays to Y.Arrays, primitives are untouched.
 */
export function convertPlainToYjsValue<T extends _Primitive>(v: T): T
export function convertPlainToYjsValue(v: readonly any[]): Y.Array<YjsValue>
export function convertPlainToYjsValue(v: Readonly<Record<string, any>>): Y.Map<YjsValue>

export function convertPlainToYjsValue(v: any): YjsValue {
  if (_isPrimitive(v)) {
    return v
  }

  if (_isArray(v)) {
    const arr = new Y.Array<YjsValue>()
    applyPlainArrayToYArray(arr, v)
    return arr as YjsValue
  }

  if (_isPlainObject(v) || isObservableObject(v)) {
    const frozenData = !!getNodeTypeAndKey(v).type?.isFrozen
    if (frozenData) {
      return v // store as is
    }

    const map = new Y.Map<YjsValue>()
    applyPlainObjectToYMap(map, v)
    return map as YjsValue
  }

  throw failure(`unsupported value type: ${v}`)
}

/**
 * Applies a plain array to a Y.Array, using the convertPlainToYjsValue to convert the values.
 *
 * @param dest - The Y.js Array that will receive the converted values.
 * @param source - The plain JavaScript array whose values will be converted and pushed to the destination.
 */
export const applyPlainArrayToYArray = (dest: Y.Array<any>, source: readonly any[]) => {
  const yjsVals = source.map(convertPlainToYjsValue)
  dest.push(yjsVals)
}

/**
 * Applies a plain object to a Y.Map, using the convertPlainToYjsValue to convert the values.
 *
 * @param dest - The destination Y.Map where the properties will be set
 * @param source - The plain JavaScript object whose properties will be applied to the Y.Map
 */
export const applyPlainObjectToYMap = (dest: Y.Map<any>, source: Readonly<Record<string, any>>) => {
  Object.entries(source).forEach(([k, v]) => {
    const yjsVal = convertPlainToYjsValue(v)
    dest.set(k, yjsVal)
  })
}
