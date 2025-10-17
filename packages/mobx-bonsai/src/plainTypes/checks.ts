import {
  isObservableArray,
  isObservableMap,
  isObservableObject,
  isObservableSet,
  ObservableMap,
  ObservableSet,
} from "mobx"
import { failure } from "../error/failure"
import { Primitive } from "./types"

export function isPrimitive(v: unknown): v is Primitive {
  const t = typeof v
  return t === "string" || t === "number" || t === "boolean" || v === null || v === undefined
}

export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === "object"
}

export function assertIsObject(value: unknown, argName: string): asserts value is object {
  if (!isObject(value)) {
    throw failure(`${argName} must be an object`)
  }
}

export function isPlainObject(v: unknown): v is Record<string, any> {
  return isObject(v) && v.constructor === Object
}

export function isArray(v: unknown): v is any[] {
  return Array.isArray(v) || isObservableArray(v)
}

export function isMap(val: unknown): val is Map<any, any> | ObservableMap {
  return val instanceof Map || isObservableMap(val)
}

export function isSet(val: unknown): val is Set<any> | ObservableSet {
  return val instanceof Set || isObservableSet(val)
}

export function isObservablePlainStructure(target: unknown): boolean {
  return isObservableObject(target) || isObservableArray(target)
}

export function assertIsObservablePlainStructure(target: unknown, argName: string): void {
  const valid = isObservablePlainStructure(target)
  if (!valid) {
    throw failure(`${argName} must be an observable object or array`)
  }
}

export function assertIsFunction(value: unknown, argName: string): asserts value is Function {
  if (typeof value !== "function") {
    throw failure(`${argName} must be a function`)
  }
}
