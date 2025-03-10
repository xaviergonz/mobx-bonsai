import { asSet } from "./asSet"

type ExtractArrayValue<T> = T extends Array<infer V> ? V : never

/**
 * Transforms an array (with values of type V) into a Set<V>.
 *
 * @template T - Type of the containing object
 * @template K - Type of the property key in T that will be transformed
 *
 * @param this - The object containing the property to transform
 * @param propName - The name of the property to transform into a Set
 * @returns A Set containing the values from the array
 */
export function arrayToSetTransform<
  T extends { [k in K]?: Array<any> | null | undefined },
  K extends keyof T,
>(propName: K): (this: T) => Set<ExtractArrayValue<T[K]>> | Extract<T[K], undefined | null> {
  return function (this: T): any {
    const array = this[propName]
    return array === null || array === undefined ? array : asSet(array)
  }
}
