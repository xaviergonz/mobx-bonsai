import {
  action,
  intercept,
  IObservableArray,
  ISetWillChange,
  isObservableArray,
  observable,
  ObservableSet,
  observe,
  transaction,
  untracked,
} from "mobx"
import { failure } from "../error/failure"
import { getMobxVersion } from "./getMobxVersion"
import { isArray } from "../plainTypes/checks"

class PlainArraySet<T> implements Set<T> {
  constructor(private readonly data: T[]) {}

  add(value: T): this {
    if (!this.has(value)) {
      this.data.push(value)
    }
    return this
  }

  clear(): void {
    this.data.length = 0
  }

  delete(value: T): boolean {
    const index = this.data.indexOf(value)
    if (index >= 0) {
      this.data.splice(index, 1)
      return true
    }
    return false
  }

  has(value: T): boolean {
    return this.data.indexOf(value) !== -1
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
    for (const v of this.data) {
      callbackfn.call(thisArg, v, v, this)
    }
  }

  get size(): number {
    return this.data.length
  }

  *entries(): ReturnType<Set<T>["entries"]> {
    for (const v of this.data) {
      yield [v, v]
    }
  }

  *keys(): ReturnType<Set<T>["keys"]> {
    yield* this.data
  }

  *values(): ReturnType<Set<T>["values"]> {
    yield* this.data
  }

  [Symbol.iterator](): ReturnType<Set<T>[typeof Symbol.iterator]> {
    return this.values()
  }

  readonly [Symbol.toStringTag] = "PlainArraySet"

  union<U>(other: ReadonlySetLike<U>): Set<T | U> {
    const s = new Set(this)
    return s.union(other)
  }

  intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
    const s = new Set(this)
    return s.intersection(other)
  }

  difference<U>(other: ReadonlySetLike<U>): Set<T> {
    const s = new Set(this)
    return s.difference(other)
  }

  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
    const s = new Set(this)
    return s.symmetricDifference(other)
  }

  isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
    const s = new Set(this)
    return s.isSubsetOf(other)
  }

  isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
    const s = new Set(this)
    return s.isSupersetOf(other)
  }

  isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
    const s = new Set(this)
    return s.isDisjointFrom(other)
  }
}

const observableSetBackedByObservableArray = <T>(
  array: IObservableArray<T>
): ObservableSet<T> & { dataObject: typeof array } => {
  if (!isObservableArray(array)) {
    throw failure("assertion failed: expected an observable array")
  }

  const set = transaction(() =>
    untracked(() => {
      if (getMobxVersion() >= 6) {
        return observable.set(array)
      } else {
        const set = observable.set()
        array.forEach((item) => {
          set.add(item)
        })
        return set
      }
    })
  )
  ;(set as ObservableSet<T> & { dataObject: typeof array }).dataObject = array

  if (set!.size !== array.length) {
    throw failure("arrays backing a set cannot contain duplicate values")
  }

  let setAlreadyChanged = false
  let arrayAlreadyChanged = false

  // for speed reasons we will just assume distinct values are only once in the array

  // when the array changes the set changes
  observe(
    array,
    action((change: any /*IArrayDidChange<T>*/) => {
      if (setAlreadyChanged) {
        return
      }

      arrayAlreadyChanged = true

      try {
        switch (change.type) {
          case "splice": {
            {
              const removed = change.removed
              for (let i = 0; i < removed.length; i++) {
                set.delete(removed[i])
              }
            }

            {
              const added = change.added
              for (let i = 0; i < added.length; i++) {
                set.add(added[i])
              }
            }

            break
          }

          case "update": {
            set.delete(change.oldValue)
            set.add(change.newValue)
            break
          }

          default:
            throw failure("assertion error: unsupported array change type")
        }
      } finally {
        arrayAlreadyChanged = false
      }
    })
  )

  // when the set changes also change the array
  intercept(
    set!,
    action((change: ISetWillChange<T>) => {
      if (setAlreadyChanged) {
        return null
      }

      if (arrayAlreadyChanged) {
        return change
      }

      setAlreadyChanged = true

      try {
        switch (change.type) {
          case "add": {
            array.push(change.newValue)
            break
          }

          case "delete": {
            const i = array.indexOf(change.oldValue)
            if (i >= 0) {
              array.splice(i, 1)
            }
            break
          }

          default:
            throw failure("assertion error: unsupported set change type")
        }

        return change
      } finally {
        setAlreadyChanged = false
      }
    })
  )

  return set! as ObservableSet<T> & { dataObject: typeof array }
}

const setCache = new WeakMap<any[], Set<any>>()

/**
 * Returns a Set-like view of the given array.
 *
 * For plain arrays, the set interface is backed by the array,
 * ensuring values appear only once. For observable arrays, mutations
 * are wrapped in actions using MobX.
 *
 * @template T The type of the values.
 * @param data An array to be wrapped as a Set.
 * @returns A Set-like view over the array.
 * @throws When data is not an array.
 */
export function asSet<T>(data: T[]): Set<T> {
  if (!isArray(data)) {
    throw failure("asSet expects an array")
  }

  let setInstance = setCache.get(data)
  if (!setInstance) {
    setInstance = isObservableArray(data)
      ? observableSetBackedByObservableArray<T>(data)
      : new PlainArraySet<T>(data)
    setCache.set(data, setInstance)
  }
  return setInstance
}
