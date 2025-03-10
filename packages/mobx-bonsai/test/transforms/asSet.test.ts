import { observable, isObservableArray, runInAction } from "mobx"
import { asSet } from "../../src"

for (const isObs of [true, false]) {
  const createArray = () => {
    const data = [1, 2, 3]
    return isObs ? observable(data) : data
  }

  describe(isObs ? "with observable array" : "with plain array", () => {
    test("should add elements only once", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      expect(setInstance.size).toBe(3)
      runInAction(() => {
        setInstance.add(4)
      })
      expect(setInstance.has(4)).toBe(true)
      expect(setInstance.size).toBe(4)
      // adding duplicate does nothing
      runInAction(() => {
        setInstance.add(1)
      })
      expect(setInstance.size).toBe(4)
    })

    test("should delete elements correctly", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      expect(setInstance.has(2)).toBe(true)
      const result = setInstance.delete(2)
      expect(result).toBe(true)
      expect(setInstance.has(2)).toBe(false)
      expect(setInstance.size).toBe(2)
      // deleting non-existent element returns false
      expect(setInstance.delete(42)).toBe(false)
    })

    test("should clear all elements", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      expect(setInstance.size).toBeGreaterThan(0)
      setInstance.clear()
      expect(setInstance.size).toBe(0)
      expect(Array.from(setInstance)).toStrictEqual([])
    })

    test("should iterate over values, keys, entries and support forEach", () => {
      const arr = createArray()
      const setInstance = asSet(arr)

      // values
      const values = Array.from(setInstance.values())
      expect(values.sort()).toStrictEqual(arr.slice().sort())

      // keys (same as values)
      const keys = Array.from(setInstance.keys())
      expect(keys.sort()).toStrictEqual(arr.slice().sort())

      // entries: [value, value]
      const entries = Array.from(setInstance.entries())
      expect(entries.length).toBe(arr.length)
      for (const [a, b] of entries) {
        expect(a).toBe(b)
        expect(setInstance.has(a)).toBe(true)
      }

      // forEach callback
      const seen: number[] = []
      setInstance.forEach((v, _v, instance) => {
        expect(instance).toBe(setInstance)
        seen.push(v)
      })
      expect(seen.sort()).toStrictEqual(arr.slice().sort())
    })

    test("should support Symbol.iterator", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      const iterated: number[] = []
      for (const v of setInstance) {
        iterated.push(v)
      }
      expect(iterated.sort()).toStrictEqual(arr.slice().sort())
    })

    test("should reflect external modifications", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      // manually modify underlying array
      runInAction(() => {
        if (!isObs && Array.isArray(arr)) {
          arr.push(5)
        } else if (isObs && isObservableArray(arr)) {
          arr.push(5)
        }
      })
      expect(setInstance.has(5)).toBe(true)
      expect(setInstance.size).toBe(arr.length)
    })

    test("should compute union correctly", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      // Ensure duplicate values don't appear
      runInAction(() => {
        setInstance.add(4)
      })
      const other = new Set([3, 4, 5])
      const union = setInstance.union(other)
      expect(Array.from(union).sort((a, b) => a - b)).toStrictEqual([1, 2, 3, 4, 5])
    })

    test("should compute intersection correctly", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      const other = new Set([2, 3, 4])
      const intersection = setInstance.intersection(other)
      expect(Array.from(intersection).sort((a, b) => a - b)).toStrictEqual([2, 3])
    })

    test("should compute difference correctly", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      const other = new Set([1, 3])
      const difference = setInstance.difference(other)
      expect(Array.from(difference).sort((a, b) => a - b)).toStrictEqual([2])
    })

    test("should compute symmetric difference correctly", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      const other = new Set([2, 4])
      const symDiff = setInstance.symmetricDifference(other)
      expect(Array.from(symDiff).sort((a, b) => a - b)).toStrictEqual([1, 3, 4])
    })

    test("should verify subset and superset relations", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      const subset = new Set([1, 2])
      const superset = new Set([1, 2, 3, 4])
      expect(setInstance.isSubsetOf(subset)).toBe(false)
      expect(setInstance.isSubsetOf(new Set([1, 2, 3]))).toBe(true)
      expect(setInstance.isSupersetOf(superset)).toBe(false)
      expect(setInstance.isSupersetOf(new Set([2, 3]))).toBe(true)
    })

    test("should verify disjoint relation", () => {
      const arr = createArray()
      const setInstance = asSet(arr)
      expect(setInstance.isDisjointFrom(new Set([4, 5]))).toBe(true)
      expect(setInstance.isDisjointFrom(new Set([3, 4]))).toBe(false)
    })
  })
}
