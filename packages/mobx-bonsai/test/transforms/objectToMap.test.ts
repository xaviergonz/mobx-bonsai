import { assert, _ } from "spec.ts"
import { nodeType, objectToMapTransform } from "../../src"
import { runInAction } from "mobx"

test("objectToMap", () => {
  type N = {
    record: Record<string, number>
  }

  const TN = nodeType<N>().getters({
    getMap: objectToMapTransform("record"),
  })

  assert(TN.getMap, _ as (n: N) => Map<string, number>)

  const n = TN({
    record: {
      a: 1,
      b: 2,
      c: 3,
    },
  })

  const map = TN.getMap(n)
  expect(TN.getMap(n)).toBe(map) // always same map for same backed object
  expect(Array.from(map.entries())).toEqual([
    ["a", 1],
    ["b", 2],
    ["c", 3],
  ])
})

test("objectToMap with undefined and null", () => {
  type N = { record?: Record<string, number> | null }
  const TN = nodeType<N>().getters({
    getMap: objectToMapTransform("record"),
  })

  assert(TN.getMap, _ as (n: N) => Map<string, number> | null | undefined)

  const n = TN({
    record: {
      a: 1,
      b: 2,
      c: 3,
    },
  })

  const map = TN.getMap(n)!
  expect(TN.getMap(n)).toBe(map) // always same map for same backed object
  expect(Array.from(map.entries())).toEqual([
    ["a", 1],
    ["b", 2],
    ["c", 3],
  ])

  runInAction(() => {
    n.record = undefined
  })
  expect(TN.getMap(n)).toBeUndefined()

  runInAction(() => {
    n.record = null
  })
  expect(TN.getMap(n)).toBeNull()
})
