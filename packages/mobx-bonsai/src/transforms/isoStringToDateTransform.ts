import { IComputedValue, computed } from "mobx"
import { getOrCreate } from "../utils/mapUtils"
import { ImmutableDate } from "./ImmutableDate"

const isoStringToDate = (isoString: string | null | undefined): ImmutableDate | null | undefined =>
  isoString === null || isoString === undefined ? isoString : new ImmutableDate(isoString)

/**
 * Transforms an ISO date string to a Date (getter).
 *
 * @param this - The object containing the property to transform
 * @param propName - The name of the property to transform
 * @returns A function that transforms the ISO string property into a Date
 */
export function isoStringToDateTransform<
  T extends { [k in K]?: string | null | undefined },
  K extends keyof T,
>(propName: K): (this: T) => ImmutableDate | Extract<T[K], undefined | null> {
  const cache = new WeakMap<object, IComputedValue<ImmutableDate>>()

  return function (this: T): any {
    const comp = getOrCreate(cache, this, () =>
      computed(() => isoStringToDate(this[propName]), { keepAlive: true })
    )

    return comp.get()
  }
}
