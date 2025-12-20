import { runInAction, set, toJS } from "mobx"
import { nodeType, TNode } from "mobx-bonsai"
import { describe, expect, test } from "vitest"
import * as Y from "yjs"
import { createObjectTestbed } from "./testbed"

describe("stress tests", () => {
  test("complex nested operations and consistency", () => {
    const { mobxObservable, yjsObject } = createObjectTestbed<any>({
      root: {
        a: 1,
        b: [1, 2, { c: 3 }],
        d: {
          e: "hello",
          f: { g: 4 },
        },
      },
    })

    const yjsMap = yjsObject as Y.Map<any>

    const checkSync = () => {
      expect(yjsMap.toJSON().root).toEqual(toJS(mobxObservable.root))
    }

    // Array operations
    runInAction(() => {
      mobxObservable.root.b.push(4)
    })
    checkSync()

    runInAction(() => {
      mobxObservable.root.b.unshift(0)
    })
    checkSync()

    runInAction(() => {
      mobxObservable.root.b.splice(2, 1, "replaced")
    })
    checkSync()

    // Object property deletion and updates
    runInAction(() => {
      mobxObservable.root.d.e = undefined
      set(mobxObservable.root.d.f, "h", 5)
      mobxObservable.root.a = { new: "object" }
    })
    checkSync()

    // Spreading (Object)
    runInAction(() => {
      mobxObservable.root.d = {
        ...toJS(mobxObservable.root.d),
        extra: "data",
        f: { ...toJS(mobxObservable.root.d.f), i: 6 },
      }
    })
    checkSync()

    // Spreading (Array)
    runInAction(() => {
      mobxObservable.root.b = [...toJS(mobxObservable.root.b), 5, 6]
    })
    checkSync()

    // Moving nodes around
    runInAction(() => {
      const subObj = mobxObservable.root.d.f
      mobxObservable.root.d.f = undefined
      set(mobxObservable.root, "copy", subObj)

      const subArr = mobxObservable.root.b
      mobxObservable.root.b = []
      set(mobxObservable.root, "arrayCopy", subArr)
    })
    checkSync()

    // Deeply nested updates on moved nodes
    runInAction(() => {
      set(mobxObservable.root.copy, "newProp", "changed")
    })
    checkSync()

    // Complex array manipulations
    runInAction(() => {
      mobxObservable.root.arrayCopy.reverse()
    })
    checkSync()

    runInAction(() => {
      mobxObservable.root.arrayCopy.sort()
    })
    checkSync()

    // Multiple levels of nesting
    runInAction(() => {
      set(mobxObservable.root, "deep", { level1: { level2: { level3: "end" } } })
      mobxObservable.root.deep.level1.level2.level3 = toJS(mobxObservable.root.copy)
    })
    checkSync()
  })

  test("keyed node stress: reordering and moving", () => {
    type T = TNode<"T", { id: number; val: string }>
    using t = nodeType<T>("T").withKey("id")

    const { mobxObservable, yjsObject } = createObjectTestbed<any>({
      arr1: [
        t.snapshot({ id: 1, val: "a" }),
        t.snapshot({ id: 2, val: "b" }),
        t.snapshot({ id: 3, val: "c" }),
      ],
      arr2: [] as T[],
    })

    const yjsMap = yjsObject as Y.Map<any>
    const checkSync = () => {
      expect(yjsMap.toJSON().arr1).toEqual(JSON.parse(JSON.stringify(mobxObservable.arr1)))
      expect(yjsMap.toJSON().arr2).toEqual(JSON.parse(JSON.stringify(mobxObservable.arr2)))
    }

    // Move from one array to another
    runInAction(() => {
      const item = mobxObservable.arr1.splice(1, 1)[0]
      mobxObservable.arr2.push(item)
    })
    checkSync()

    // Reorder within array
    runInAction(() => {
      const item = mobxObservable.arr1.shift()!
      mobxObservable.arr1.push(item)
    })
    checkSync()

    // Swap elements
    runInAction(() => {
      const item1 = mobxObservable.arr1[0]
      const item2 = mobxObservable.arr1[1]
      mobxObservable.arr1.splice(0, 2, item2, item1)
    })
    checkSync()

    // Modify moved node
    runInAction(() => {
      mobxObservable.arr2[0].val = "modified"
    })
    checkSync()
  })

  test("diamond shape (shared references) handling", () => {
    const { mobxObservable, yjsObject } = createObjectTestbed<any>({
      root: {
        shared: { data: "initial" },
      },
    })

    const yjsMap = yjsObject as Y.Map<any>

    runInAction(() => {
      const shared = mobxObservable.root.shared
      mobxObservable.root.shared = undefined
      set(mobxObservable.root, "left", shared)
    })

    expect(mobxObservable.root.shared).toBeUndefined()
    expect(mobxObservable.root.left.data).toBe("initial")
    expect(yjsMap.toJSON().root.shared).toBeUndefined()
    expect(yjsMap.toJSON().root.left.data).toBe("initial")

    runInAction(() => {
      const left = mobxObservable.root.left
      mobxObservable.root.left = undefined
      set(mobxObservable.root, "right", left)
    })

    expect(mobxObservable.root.left).toBeUndefined()
    expect(mobxObservable.root.right.data).toBe("initial")
    expect(yjsMap.toJSON().root.left).toBeUndefined()
    expect(yjsMap.toJSON().root.right.data).toBe("initial")
  })
})
