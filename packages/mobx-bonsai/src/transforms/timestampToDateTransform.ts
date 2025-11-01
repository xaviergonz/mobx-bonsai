import { computed, IComputedValue } from "mobx"
import { getOrCreate } from "../utils/mapUtils"
import { ImmutableDate } from "./ImmutableDate"

const timestampToDate = (timestamp: number | null | undefined): ImmutableDate | null | undefined =>
  timestamp === null || timestamp === undefined ? timestamp : new ImmutableDate(timestamp)

/**
 * Transforms a timestamp number to a Date (getter).
 *
 * @param this - The object containing the property to transform
 * @param propName - The name of the property to transform
 * @returns A function that transforms the timestamp property into a Date
 */
export function timestampToDateTransform<
  T extends { [k in K]?: number | null | undefined },
  K extends keyof T,
>(propName: K): (this: T) => ImmutableDate | Extract<T[K], undefined | null> {
  const cache = new WeakMap<object, IComputedValue<ImmutableDate>>()

  return function (this: T): any {
    const comp = getOrCreate(cache, this, () =>
      computed(() => timestampToDate(this[propName]), { keepAlive: true })
    )

    return comp.get()
  }
}
