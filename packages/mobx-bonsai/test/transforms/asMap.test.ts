import { observable, runInAction } from "mobx"
import { asMap } from "../../src"

for (const isObservable of [true, false]) {
  const createObject = () => {
    const data = { x: 10, y: true }
    return isObservable ? observable(data) : data
  }

  describe(isObservable ? "with observable object" : "with plain object", () => {
    test("should reflect get, set, delete and clear operations", () => {
      const obj: Record<string, any> = createObject()
      const map = asMap(obj)

      expect(map.get("x")).toBe(10)
      expect(map.has("y")).toBe(true)

      // set new key
      map.set("z", 30)
      expect(map.get("z")).toBe(30)
      expect(obj.z).toBe(30)

      // update an existing key
      map.set("x", 15)
      expect(map.get("x")).toBe(15)
      expect(obj.x).toBe(15)

      // delete a key
      expect(map.delete("y")).toBe(true)
      expect(map.has("y")).toBe(false)
      expect(obj.y).toBeUndefined()

      // clear the map
      map.clear()
      expect(map.size).toBe(0)
      expect(Object.keys(obj)).not.toContain("x")
      expect(Object.keys(obj)).not.toContain("z")
    })

    test("should iterate over keys, values, and entries correctly", () => {
      const obj: Record<string, any> = createObject()
      // add extra keys to object
      runInAction(() => {
        obj.a = "alpha"
        obj.b = "bravo"
      })
      const map = asMap(obj)

      // check keys
      const keysArray = Array.from(map.keys())
      expect(keysArray.sort()).toStrictEqual(Object.keys(obj).sort())

      // check values
      const valuesArray = Array.from(map.values())
      const expectedValues = Object.keys(obj).map((key) => obj[key])
      expect(valuesArray.sort()).toStrictEqual(expectedValues.sort())

      // check entries via for-of iteration
      const entriesArray: [string, any][] = []
      for (const entry of map) {
        entriesArray.push(entry)
      }
      expect(entriesArray.sort()).toStrictEqual(Object.entries(obj).sort())
    })

    test("should update size correctly", () => {
      const obj: Record<string, any> = createObject()
      const map = asMap(obj)
      const initialSize = map.size

      // add a new key
      map.set("newKey", 123)
      expect(map.size).toBe(initialSize + 1)

      // delete a key
      map.delete("x")
      expect(map.size).toBe(initialSize)

      // clear should reset the size to 0
      map.clear()
      expect(map.size).toBe(0)
    })

    test("should reflect changes in iteration after updates", () => {
      const obj: Record<string, any> = createObject()
      const map = asMap(obj)

      // update underlying data via map
      map.set("k1", "v1")
      map.set("k2", "v2")

      const keys1 = Array.from(map.keys())
      expect(keys1).toEqual(expect.arrayContaining(["x", "y", "k1", "k2"]))

      // delete one key and verify iteration reflects change
      map.delete("y")
      const keys2 = Array.from(map.keys())
      expect(keys2).toEqual(expect.arrayContaining(["x", "k1", "k2"]))
      expect(keys2).not.toContain("y")
    })

    test("should call forEach exactly once per key", () => {
      const obj: Record<string, any> = createObject()
      const map = asMap(obj)
      const seenEntries: [string, any][] = []

      map.forEach((value, key, iteratedMap) => {
        expect(iteratedMap).toBe(map)
        seenEntries.push([key, value])
      })

      const expectedEntries = Object.entries(obj)
      expect(seenEntries.sort()).toStrictEqual(expectedEntries.sort())
    })

    test("should support Symbol.iterator", () => {
      const obj: Record<string, any> = createObject()
      const map = asMap(obj)
      const iteratedEntries = [...map] // using Symbol.iterator
      expect(iteratedEntries.sort()).toStrictEqual(Object.entries(obj).sort())
    })

    test("should expose correct Symbol.toStringTag", () => {
      const obj: Record<string, any> = createObject()
      const map = asMap(obj)
      const expectedTag = isObservable ? "ObservableObjectMap" : "PlainObjectMap"
      expect(map[Symbol.toStringTag]).toBe(expectedTag)
    })
  })
}
