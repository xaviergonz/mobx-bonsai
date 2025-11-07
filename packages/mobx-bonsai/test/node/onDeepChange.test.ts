import { runInAction } from "mobx"
import { NodeChange, node, onDeepChange } from "../../src"

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

  // Normalize events by removing MobX version-specific properties
  const normalizedEvents = events.map((event) => {
    // biome-ignore lint/correctness/noUnusedVariables: unused to get the rest
    const { debugObjectName, observableKind, ...rest } = event as any
    return rest
  })

  expect(normalizedEvents).toMatchInlineSnapshot(`
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
    "oldValue": 1,
    "type": "update",
  },
  {
    "added": [
      1,
    ],
    "addedCount": 1,
    "index": 0,
    "object": [
      1,
    ],
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
