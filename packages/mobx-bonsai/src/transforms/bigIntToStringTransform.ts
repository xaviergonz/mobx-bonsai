/**
 * Transforms a BigInt to a string (action).
 *
 * @param this - The object containing the property to transform
 * @param propName - The name of the property to transform
 * @returns A function that sets the BigInt argument into the string property
 */
export function bigIntToStringTransform<
  T extends { [k in K]?: string | null | undefined },
  K extends keyof T,
>(propName: K): (this: T, bigint: bigint | Extract<T[K], undefined | null>) => void {
  return function (this: any, bigint): void {
    this[propName] = bigint === null || bigint === undefined ? bigint : bigint.toString()
  }
}
