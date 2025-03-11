import { ImmutableDate } from "./ImmutableDate"

/**
 * Transforms a Date to an ISO date string (action).
 *
 * @param this - The object containing the property to transform
 * @param propName - The name of the property to transform
 * @returns A function that sets the Date argument into the ISO string property
 */
export function dateToIsoStringTransform<
  T extends { [k in K]?: string | null | undefined },
  K extends keyof T,
>(propName: K): (this: T, date: Date | ImmutableDate | Extract<T[K], undefined | null>) => void {
  return function (this: any, date): void {
    this[propName] = date === null || date === undefined ? date : date.toISOString()
  }
}
