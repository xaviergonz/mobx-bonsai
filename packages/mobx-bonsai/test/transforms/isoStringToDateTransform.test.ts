import { assert, _ } from "spec.ts"
import { ImmutableDate, nodeType, isoStringToDateTransform } from "../../src"
import { runInAction } from "mobx"

test("isoStringToDateTransform returns ImmutableDate for valid ISO string", () => {
  type N = { isoString: string }
  const TN = nodeType<N>().getters({
    getDate: isoStringToDateTransform("isoString"),
  })

  assert(TN.getDate, _ as (n: N) => ImmutableDate)

  const d = new Date()
  const isoString = d.toISOString()
  const n = TN({ isoString })
  const date = TN.getDate(n)
  expect(date instanceof ImmutableDate).toBe(true)
  expect(date.getTime()).toBe(d.getTime())
})

test("isoStringToDateTransform returns same instance for same object", () => {
  type N = { isoString: string }
  const TN = nodeType<N>().getters({
    getDate: isoStringToDateTransform("isoString"),
  })

  const d = new Date()
  const isoString = d.toISOString()
  const n = TN({ isoString })
  const date1 = TN.getDate(n)
  const date2 = TN.getDate(n)
  expect(date1).toBe(date2)
})

test("isoStringToDateTransform returns undefined and null correctly", () => {
  type N = { isoString?: string | null }
  const TN = nodeType<N>().getters({
    getDate: isoStringToDateTransform("isoString"),
  })

  assert(TN.getDate, _ as (n: N) => ImmutableDate | undefined | null)

  const d = new Date()
  const isoString = d.toISOString()
  const n = TN({ isoString })
  expect((TN.getDate(n) as ImmutableDate).toISOString()).toBe(isoString)

  // undefined case
  runInAction(() => {
    n.isoString = undefined
  })
  expect(TN.getDate(n)).toBeUndefined()

  // null case
  runInAction(() => {
    n.isoString = null
  })
  expect(TN.getDate(n)).toBeNull()
})
