import { runInAction } from "mobx"
import { type NodeInterceptedChange, node, onDeepInterceptedChange } from "../../src"

it("should notify listener before changes are applied", () => {
  const testNode = node<{ a: number; arr: number[] }>({ a: 1, arr: [] })
  const events: NodeInterceptedChange[] = []

  const dispose = onDeepInterceptedChange(testNode, (change) => {
    events.push(change)
    // Verify state hasn't changed yet
    if (change.object === testNode && "name" in change && change.name === "a") {
      expect(testNode.a).toBe(1)
    }
    if (change.object === testNode.arr) {
      expect(testNode.arr).toEqual([])
    }
  })

  // Change property on the first level
  runInAction(() => {
    testNode.a = 2
  })
  // Mutate a nested array
  runInAction(() => {
    testNode.arr.push(1)
  })

  expect(events).toMatchInlineSnapshot(`
[
  {
    "name": "a",
    "newValue": 2,
    "object": {
      "a": 2,
      "arr": [
        1,
      ],
    },
    "type": "update",
  },
  {
    "added": [
      1,
    ],
    "index": 0,
    "object": [
      1,
    ],
    "removedCount": 0,
    "type": "splice",
  },
]
`)

  // After actions, changes should be applied
  expect(testNode.a).toBe(2)
  expect(testNode.arr).toEqual([1])

  events.length = 0
  dispose()

  // Should not notify listener after it is disposed
  runInAction(() => {
    testNode.a = 20
  })
  expect(events).toHaveLength(0)
})
