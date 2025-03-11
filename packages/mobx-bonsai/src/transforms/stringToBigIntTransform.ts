const stringToBigInt = (str: string | null | undefined): bigint | null | undefined =>
  str === null || str === undefined ? str : BigInt(str)

/**
 * Transforms a string to a BigInt (getter).
 *
 * @param this - The object containing the property to transform
 * @param propName - The name of the property to transform
 * @returns A function that transforms the string property into a BigInt
 */
export function stringToBigIntTransform<
  T extends { [k in K]?: string | null | undefined },
  K extends keyof T,
>(propName: K): (this: T) => bigint | Extract<T[K], undefined | null> {
  return function (this: T): any {
    return stringToBigInt(this[propName])
  }
}
