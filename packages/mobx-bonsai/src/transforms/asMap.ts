import { entries, get, has, isObservableObject, keys, remove, runInAction, set, values } from "mobx"
import { failure } from "../error/failure"
import { isPlainObject } from "../plainTypes/checks"

class PlainObjectMap<V> implements Map<string, V> {
  constructor(private readonly data: Record<string, V>) {}

  clear(): void {
    for (const key of Object.keys(this.data)) {
      delete this.data[key]
    }
  }

  delete(key: string): boolean {
    if (this.has(key)) {
      delete this.data[key]
      return true
    }
    return false
  }

  forEach(callbackfn: (value: V, key: string, map: Map<string, V>) => void, thisArg?: any): void {
    for (const key of Object.keys(this.data)) {
      callbackfn.call(thisArg, this.data[key], key, this)
    }
  }

  get(key: string): V | undefined {
    return this.data[key]
  }

  has(key: string): boolean {
    return Object.hasOwn(this.data, key)
  }

  set(key: string, value: V): this {
    this.data[key] = value
    return this
  }

  get size(): number {
    return Object.keys(this.data).length
  }

  *entries(): ReturnType<Map<string, V>["entries"]> {
    yield* Object.entries(this.data)
  }

  *keys(): ReturnType<Map<string, V>["keys"]> {
    yield* Object.keys(this.data)
  }

  *values(): ReturnType<Map<string, V>["values"]> {
    yield* Object.values(this.data)
  }

  [Symbol.iterator](): ReturnType<Map<string, V>[typeof Symbol.iterator]> {
    return this.entries()
  }

  readonly [Symbol.toStringTag] = "PlainObjectMap"
}

class ObservableObjectMap<V> implements Map<string, V> {
  constructor(private readonly data: Record<string, V>) {}

  clear(): void {
    runInAction(() => {
      for (const key of keys(this.data)) {
        remove(this.data, key as string)
      }
    })
  }

  delete(key: string): boolean {
    return runInAction(() => {
      if (this.has(key)) {
        remove(this.data, key)
        return true
      }
      return false
    })
  }

  forEach(callbackfn: (value: V, key: string, map: Map<string, V>) => void, thisArg?: any): void {
    for (const key of keys(this.data)) {
      const value = this.get(key as string)!
      callbackfn.call(thisArg, value, key as string, this)
    }
  }

  get(key: string): V | undefined {
    return get(this.data, key)
  }

  has(key: string): boolean {
    return has(this.data, key)
  }

  set(key: string, value: V): this {
    runInAction(() => {
      set(this.data, key, value)
    })
    return this
  }

  get size(): number {
    return keys(this.data).length
  }

  *entries(): ReturnType<Map<string, V>["entries"]> {
    yield* entries(this.data)
  }

  *keys(): ReturnType<Map<string, V>["keys"]> {
    yield* keys(this.data) as ReadonlyArray<string>
  }

  *values(): ReturnType<Map<string, V>["values"]> {
    yield* values(this.data)
  }

  [Symbol.iterator](): ReturnType<Map<string, V>[typeof Symbol.iterator]> {
    return this.entries()
  }

  readonly [Symbol.toStringTag] = "ObservableObjectMap"
}

const mapCache = new WeakMap<Record<string, any>, Map<string, any>>()

/**
 * Returns a reactive Map-like view of the given object.
 *
 * The input must be a plain object or an observable object.
 *
 * @template V The type of the values in the object.
 * @param data The plain or observable object to wrap as a Map.
 * @returns A Map-like view of the object.
 */
export function asMap<V>(data: Record<string, V>): Map<string, V> {
  if (!(isPlainObject(data) || isObservableObject(data))) {
    throw failure("asMap expects an object")
  }

  let map = mapCache.get(data)
  if (!map) {
    if (isObservableObject(data)) {
      map = new ObservableObjectMap(data)
    } else {
      map = new PlainObjectMap(data)
    }
    mapCache.set(data, map)
  }
  return map
}
