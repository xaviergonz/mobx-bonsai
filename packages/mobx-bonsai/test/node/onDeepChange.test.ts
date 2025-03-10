import { node, onDeepChange, NodeChange } from "../../src"
import { runInAction } from "mobx"

it("should notify listener on object property changes", () => {
  const testNode = node<{ a: number; arr: number[] }>({ a: 1, arr: [] })
  const events: NodeChange[] = []

  const dispose = onDeepChange(testNode, (change) => {
    events.push(change)
  })

  // change property on the first level
  runInAction(() => {
    testNode.a++
  })
  // mutate a nested array
  runInAction(() => {
    testNode.arr.push(1)
  })

  expect(events).toMatchInlineSnapshot(`
[
  {
    "debugObjectName": "ObservableObject@2",
    "name": "a",
    "newValue": 2,
    "object": {
      "a": 2,
      "arr": [
        1,
      ],
    },
    "observableKind": "object",
    "oldValue": 1,
    "type": "update",
  },
  {
    "added": [
      1,
    ],
    "addedCount": 1,
    "debugObjectName": "ObservableArray@4",
    "index": 0,
    "object": [
      1,
    ],
    "observableKind": "array",
    "removed": [],
    "removedCount": 0,
    "type": "splice",
  },
]
`)
  events.length = 0

  dispose()

  // should not notify listener after it is disposed
  runInAction(() => {
    testNode.a = 20
  })
  expect(events).toHaveLength(0)
  events.length = 0
})
