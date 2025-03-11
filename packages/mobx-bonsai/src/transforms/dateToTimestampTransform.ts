import { ImmutableDate } from "./ImmutableDate"

/**
 * Transforms a Date to a timestamp number (action).
 *
 * @param this - The object containing the property to transform
 * @param propName - The name of the property to transform
 * @returns A function that sets the Date argument into the timestamp property
 */
export function dateToTimestampTransform<
  T extends { [k in K]?: number | null | undefined },
  K extends keyof T,
>(propName: K): (this: T, date: Date | ImmutableDate | Extract<T[K], undefined | null>) => void {
  return function (this: any, date): void {
    this[propName] = date === null || date === undefined ? date : date.getTime()
  }
}
