import { assert, _ } from "spec.ts"
import { ImmutableDate, nodeType, timestampToDateTransform } from "../../src"
import { runInAction } from "mobx"

test("timestampToDateTransform returns ImmutableDate for valid timestamp", () => {
  type N = { timestamp: number }
  const TN = nodeType<N>().getters({
    getDate: timestampToDateTransform("timestamp"),
  })

  assert(TN.getDate, _ as (n: N) => ImmutableDate)

  const t = 1633072800000
  const n = TN({ timestamp: t })
  const date = TN.getDate(n)
  expect(date instanceof ImmutableDate).toBe(true)
  expect(date.getTime()).toBe(t)
})

test("timestampToDateTransform returns same instance for same object", () => {
  type N = { timestamp: number }
  const TN = nodeType<N>().getters({
    getDate: timestampToDateTransform("timestamp"),
  })

  const t = 1633072800000
  const n = TN({ timestamp: t })
  const date1 = TN.getDate(n)
  const date2 = TN.getDate(n)
  expect(date1).toBe(date2)
})

test("timestampToDateTransform returns undefined and null correctly", () => {
  type N = { timestamp?: number | null }
  const TN = nodeType<N>().getters({
    getDate: timestampToDateTransform("timestamp"),
  })

  // valid timestamp case
  const t = 1633072800000
  const n = TN({ timestamp: t })
  expect((TN.getDate(n) as ImmutableDate).getTime()).toBe(t)

  // undefined case
  runInAction(() => {
    n.timestamp = undefined
  })
  expect(TN.getDate(n)).toBeUndefined()

  // null case
  runInAction(() => {
    n.timestamp = null
  })
  expect(TN.getDate(n)).toBeNull()
})
