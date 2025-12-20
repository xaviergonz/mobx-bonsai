import { runInAction } from "mobx"
import { nodeType, TNode } from "mobx-bonsai"
import { describe, expect, test } from "vitest"
import * as Y from "yjs"
import { createArrayTestbed, createObjectTestbed } from "./testbed"

function isYjsValueDeleted(yjsValue: Y.AbstractType<any>): boolean {
  return !!(yjsValue as any)._item?.deleted || !!yjsValue.doc?.isDestroyed
}

describe("detached Yjs structures", () => {
  test("moving a node in MobX should create a new Yjs structure (not reuse the detached one)", () => {
    const { mobxObservable, yjsObject, getYjsValueForNode } = createObjectTestbed({
      a: {
        foo: "bar",
      },
      b: undefined as any,
    })

    const subNode = mobxObservable.a
    const oldYjsSub = getYjsValueForNode(subNode) as Y.Map<any>

    expect(oldYjsSub).toBeDefined()
    expect(oldYjsSub.get("foo")).toBe("bar")
    expect(oldYjsSub.doc).toBeDefined()

    // Move the node
    runInAction(() => {
      mobxObservable.a = undefined as any
      mobxObservable.b = subNode
    })

    // The old Yjs structure should be detached
    // Note: In Yjs, .doc remains set even after deletion because the item
    // still exists in the document's history/store (marked as deleted).
    expect(isYjsValueDeleted(oldYjsSub)).toBe(true)

    // But it should be "deleted" in some way.
    // In Yjs, once an item is deleted, it's gone from the tree.
    expect(yjsObject.get("a")).toBeUndefined()

    const newYjsSub = getYjsValueForNode(subNode) as Y.Map<any>
    expect(newYjsSub).toBeDefined()
    expect(newYjsSub).not.toBe(oldYjsSub) // CRITICAL: should not be the same instance
    expect(newYjsSub.get("foo")).toBe("bar")
    expect(newYjsSub.doc).toBeDefined()

    expect(yjsObject.get("b")).toBe(newYjsSub)
  })

  test("Yjs structures behavior when removed", () => {
    const yjsDoc = new Y.Doc()
    const yjsMap = yjsDoc.getMap("test")
    const subMap = new Y.Map()
    yjsMap.set("sub", subMap)
    subMap.set("foo", "bar")

    expect(subMap.doc).toBe(yjsDoc)
    expect(subMap.toJSON()).toEqual({ foo: "bar" })
    expect(isYjsValueDeleted(subMap)).toBe(false)

    yjsMap.delete("sub")

    expect(isYjsValueDeleted(subMap)).toBe(true)
    expect(subMap.toJSON()).toEqual({})

    // Can we re-attach it?
    expect(() => {
      yjsMap.set("sub2", subMap)
    }).toThrow() // Yjs should throw if we try to re-attach a detached structure that was part of a doc
  })

  test("moving a keyed node in MobX should create a new Yjs structure", () => {
    type T = TNode<"T", { id: number; foo: string }>
    using t = nodeType<T>("T").withKey("id")

    const { mobxObservable, yjsObject, getYjsValueForNode } = createObjectTestbed({
      arr: [t.snapshot({ id: 1, foo: "bar" })],
      otherArr: [] as T[],
    })

    const subNode = mobxObservable.arr[0]
    const oldYjsSub = getYjsValueForNode(subNode) as Y.Map<any>

    expect(oldYjsSub).toBeDefined()
    expect(oldYjsSub.get("foo")).toBe("bar")

    // Move the keyed node
    runInAction(() => {
      mobxObservable.arr.splice(0, 1)
      mobxObservable.otherArr.push(subNode)
    })

    expect(isYjsValueDeleted(oldYjsSub)).toBe(true)

    const newYjsSub = getYjsValueForNode(subNode) as Y.Map<any>
    expect(newYjsSub).toBeDefined()
    expect(newYjsSub).not.toBe(oldYjsSub) // Should still be a new instance
    expect(isYjsValueDeleted(newYjsSub)).toBe(false)
    expect(newYjsSub.get("foo")).toBe("bar")

    expect((yjsObject.get("arr") as Y.Array<any>).length).toBe(0)
    expect((yjsObject.get("otherArr") as Y.Array<any>).get(0)).toBe(newYjsSub)
  })

  test("moving a keyed node within the same array should create a new Yjs structure", () => {
    type T = TNode<"T", { id: number; foo: string }>
    using t = nodeType<T>("T").withKey("id")

    const { mobxObservable, yjsObject, getYjsValueForNode } = createObjectTestbed({
      arr: [t.snapshot({ id: 1, foo: "bar" }), t.snapshot({ id: 2, foo: "baz" })],
    })

    const subNode = mobxObservable.arr[0]
    const oldYjsSub = getYjsValueForNode(subNode) as Y.Map<any>

    expect(oldYjsSub).toBeDefined()
    expect(oldYjsSub.get("foo")).toBe("bar")

    // Move the keyed node from start to end
    runInAction(() => {
      mobxObservable.arr.splice(0, 1)
      mobxObservable.arr.push(subNode)
    })

    expect(isYjsValueDeleted(oldYjsSub)).toBe(true)

    const newYjsSub = getYjsValueForNode(subNode) as Y.Map<any>
    expect(newYjsSub).toBeDefined()
    expect(newYjsSub).not.toBe(oldYjsSub) // Should still be a new instance
    expect(isYjsValueDeleted(newYjsSub)).toBe(false)
    expect(newYjsSub.get("foo")).toBe("bar")

    const yjsArray = yjsObject.get("arr") as Y.Array<any>
    expect(yjsArray.length).toBe(2)
    expect(yjsArray.get(1)).toBe(newYjsSub)
  })

  test("internal array move (start to end)", () => {
    const { mobxObservable, getYjsValueForNode } = createArrayTestbed<any[]>([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ])

    const node1 = mobxObservable[0]
    const yjs1 = getYjsValueForNode(node1)

    runInAction(() => {
      const item = mobxObservable.shift()
      mobxObservable.push(item)
    })

    expect(mobxObservable[2]).toBe(node1)
    const newYjs1 = getYjsValueForNode(node1)
    expect(newYjs1).not.toBe(yjs1)
    expect(isYjsValueDeleted(yjs1)).toBe(true)
    expect(newYjs1.toJSON()).toEqual({ id: 1 })
  })
})
