import { runInAction } from "mobx"
import { nodeType, TNode } from "mobx-bonsai"
import * as Y from "yjs"
import { createObjectTestbed } from "./testbed"

test("should update underlying Y.js structure when onNodeInit increases counter", () => {
  type T0 = TNode<"0", { counter: number; child?: T0 }>
  using t0 = nodeType<T0>("0")

  t0.onInit((node) => {
    node.counter += 1
  })

  const { mobxObservable, yjsObject } = createObjectTestbed<T0>(
    t0.snapshot({
      counter: 0,
    })
  )

  const yjsMap = yjsObject as Y.Map<any>
  expect(mobxObservable.counter).toBe(1)
  expect(yjsMap.get("counter")).toBe(1)

  runInAction(() => {
    mobxObservable.child = t0.snapshot({ counter: 1 })
  })
  expect(mobxObservable.child!.counter).toBe(2)
  expect(yjsMap.get("child")!.get("counter")).toBe(2)
})
