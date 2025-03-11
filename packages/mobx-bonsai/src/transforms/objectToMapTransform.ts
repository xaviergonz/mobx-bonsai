import { asMap } from "./asMap"

type ExtractRecordValue<T> = T extends Record<string, infer V> ? V : never

/**
 * Transforms a record object (with string keys and values of type V)
 * into a Map<string, V> (getter).
 *
 * @template T - Type of the containing object
 * @template K - Type of the property key in T that will be transformed
 *
 * @param this - The object containing the property to transform
 * @param propName - The name of the property to transform into a Map
 * @returns A function that returns a Map backed by the key-value pairs from the record property
 */
export function objectToMapTransform<
  T extends { [k in K]?: Record<string, any> | null | undefined },
  K extends keyof T,
>(
  propName: K
): (this: T) => Map<string, ExtractRecordValue<T[K]>> | Extract<T[K], undefined | null> {
  return function (this: T): any {
    const record = this[propName]
    return record === null || record === undefined ? record : asMap(record)
  }
}
