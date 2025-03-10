import { assert, _ } from "spec.ts"
import { nodeType, arrayToSet } from "../../src"
import { runInAction } from "mobx"

test("arrayToSet", () => {
  type N = {
    list: number[]
  }

  const TN = nodeType<N>().getters({
    getSet: arrayToSet("list"),
  })

  assert(TN.getSet, _ as (n: N) => Set<number>)

  const n = TN({
    list: [1, 2, 3],
  })

  const set = TN.getSet(n)
  expect(TN.getSet(n)).toBe(set) // always same set for same backed object
  expect(Array.from(set)).toEqual([1, 2, 3])
})

test("arrayToSet with undefined and null", () => {
  type N = {
    list?: number[] | null
  }

  const TN = nodeType<N>().getters({
    getSet: arrayToSet("list"),
  })

  assert(TN.getSet, _ as (n: N) => Set<number> | null | undefined)

  const n = TN({
    list: [1, 2, 3],
  })

  const set = TN.getSet(n)!
  expect(TN.getSet(n)).toBe(set) // always same set for same backed object
  expect(Array.from(set)).toEqual([1, 2, 3])

  runInAction(() => {
    n.list = undefined
  })
  expect(TN.getSet(n)).toBeUndefined()

  runInAction(() => {
    n.list = null
  })
  expect(TN.getSet(n)).toBeNull()
})
