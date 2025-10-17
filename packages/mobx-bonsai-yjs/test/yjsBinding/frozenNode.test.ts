import { runInAction } from "mobx"
import { isFrozenNode, node, nodeType, TNode } from "mobx-bonsai"
import * as Y from "yjs"
import { createObjectTestbed } from "./testbed"

test("frozen nodes are stored as plain values instead of maps", () => {
  type Frozen = TNode<"Frozen", { nested: { a: number } }>
  const TFrozen = nodeType<Frozen>("Frozen").frozen()

  const { mobxObservable, yjsObject, getYjsValueForNode } = createObjectTestbed({
    frozen: TFrozen.snapshot({
      nested: { a: 1 },
    }) as any,
  })

  expect(isFrozenNode(mobxObservable.frozen)).toBe(true)
  const yjsFrozen = yjsObject.get("frozen")
  expect(getYjsValueForNode(mobxObservable.frozen)).toBe(yjsFrozen)
  expect(yjsFrozen).not.toBeInstanceOf(Y.Map)
  expect(yjsFrozen).toStrictEqual(TFrozen.snapshot({ nested: { a: 1 } }))

  // change to a proper node, then back to a frozen node
  runInAction(() => {
    mobxObservable.frozen = node({
      nested: { a: 2 },
    })
  })
  expect(getYjsValueForNode(mobxObservable.frozen) instanceof Y.Map).toBe(true)

  runInAction(() => {
    mobxObservable.frozen = TFrozen({
      nested: { a: 3 },
    })
  })
  expect(getYjsValueForNode(mobxObservable.frozen) instanceof Y.Map).toBe(false)
})
