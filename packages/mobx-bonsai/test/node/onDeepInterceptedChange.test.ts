import { runInAction, toJS } from "mobx"
import { type NodeInterceptedChange, node, onDeepInterceptedChange } from "../../src"

describe("onDeepInterceptedChange", () => {
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
      // Return change to accept it
      return change
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
    // Note: In MobX 4, observable arrays need toJS() for proper comparison
    expect(toJS(testNode.arr)).toEqual([1])

    events.length = 0
    dispose()

    // Should not notify listener after it is disposed
    runInAction(() => {
      testNode.a = 20
    })
    expect(events).toHaveLength(0)
  })

  it("should allow cancelling changes by returning null", () => {
    const testNode = node<{ a: number; b: string }>({ a: 1, b: "initial" })
    const events: NodeInterceptedChange[] = []

    const dispose = onDeepInterceptedChange(testNode, (change) => {
      events.push(change)
      // Cancel changes to property 'a' by returning null
      if ("name" in change && change.name === "a") {
        return null
      }
      // Accept other changes
      return change
    })

    // Try to change 'a' - should be cancelled
    runInAction(() => {
      testNode.a = 100
    })

    // Change 'b' - should succeed
    runInAction(() => {
      testNode.b = "modified"
    })

    // Only 'b' should have changed
    expect(testNode.a).toBe(1)
    expect(testNode.b).toBe("modified")
    expect(events).toHaveLength(2)

    dispose()
  })

  it("should stop propagation to parent listeners when null is returned", () => {
    const parentNode = node<{ child: { value: number } }>({
      child: { value: 10 },
    })
    const childNode = parentNode.child

    const parentEvents: NodeInterceptedChange[] = []
    const childEvents: NodeInterceptedChange[] = []

    const parentDispose = onDeepInterceptedChange(parentNode, (change) => {
      parentEvents.push(change)
      return change
    })

    const childDispose = onDeepInterceptedChange(childNode, (change) => {
      childEvents.push(change)
      // Cancel at child level by returning null
      return null
    })

    // Try to change child value - should be cancelled at child level
    runInAction(() => {
      childNode.value = 999
    })

    // Child listener should have received the event
    expect(childEvents).toHaveLength(1)
    // Parent listener should NOT have received the event (propagation stopped)
    expect(parentEvents).toHaveLength(0)
    // Value should not have changed
    expect(childNode.value).toBe(10)

    parentDispose()
    childDispose()
  })

  it("should allow modifying change object", () => {
    const testNode = node<{ value: number }>({ value: 5 })

    const dispose = onDeepInterceptedChange(testNode, (change) => {
      // Normalize: ensure value is always positive
      if (
        "name" in change &&
        change.name === "value" &&
        "newValue" in change &&
        change.newValue < 0
      ) {
        change.newValue = Math.abs(change.newValue)
      }
      // Return modified change
      return change
    })

    // Try to set negative value
    runInAction(() => {
      testNode.value = -42
    })

    // Should have been normalized to positive
    expect(testNode.value).toBe(42)

    dispose()
  })

  it("should allow throwing exceptions to prevent changes", () => {
    const testNode = node<{ value: number }>({ value: 10 })

    const dispose = onDeepInterceptedChange(testNode, (change) => {
      // Invariant: value must be <= 100
      if (
        "name" in change &&
        change.name === "value" &&
        "newValue" in change &&
        change.newValue > 100
      ) {
        throw new Error("Value cannot exceed 100")
      }
      return change
    })

    // This should succeed
    runInAction(() => {
      testNode.value = 50
    })
    expect(testNode.value).toBe(50)

    // This should throw
    expect(() => {
      runInAction(() => {
        testNode.value = 150
      })
    }).toThrow("Value cannot exceed 100")

    // Value should not have changed
    expect(testNode.value).toBe(50)

    dispose()
  })

  it("should work with array operations", () => {
    const testNode = node<{ items: number[] }>({ items: [1, 2, 3] })
    const events: NodeInterceptedChange[] = []

    const dispose = onDeepInterceptedChange(testNode, (change) => {
      events.push(change)
      // Prevent adding even numbers by returning null
      if (change.object === testNode.items && change.type === "splice" && "added" in change) {
        const hasEvenNumber = change.added.some((n) => n % 2 === 0)
        if (hasEvenNumber) {
          return null
        }
      }
      return change
    })

    // Try to add even number - should be cancelled
    runInAction(() => {
      testNode.items.push(4)
    })
    // Note: In MobX 4, observable arrays need toJS() for proper comparison
    expect(toJS(testNode.items)).toEqual([1, 2, 3])

    // Add odd number - should succeed
    runInAction(() => {
      testNode.items.push(5)
    })
    expect(toJS(testNode.items)).toEqual([1, 2, 3, 5])

    expect(events).toHaveLength(2)

    dispose()
  })

  it("should stop calling listeners when one returns null", () => {
    const testNode = node<{ a: number }>({ a: 1 })

    let listener1Called = false
    let listener2Called = false
    let listener3Called = false

    // Listener 1: Always allows changes
    const dispose1 = onDeepInterceptedChange(testNode, (change) => {
      listener1Called = true
      return change
    })

    // Listener 2: Cancels changes to 'a' by returning null
    const dispose2 = onDeepInterceptedChange(testNode, (change) => {
      listener2Called = true
      if ("name" in change && change.name === "a") {
        return null
      }
      return change
    })

    // Listener 3: Should NOT be called because listener 2 returned null
    const dispose3 = onDeepInterceptedChange(testNode, (change) => {
      listener3Called = true
      return change
    })

    // Try to change 'a'
    runInAction(() => {
      testNode.a = 100
    })

    // First two listeners should have been called
    expect(listener1Called).toBe(true)
    expect(listener2Called).toBe(true)
    // Third listener should NOT be called (previous listener cancelled)
    expect(listener3Called).toBe(false)
    // Change should not have been applied (cancelled)
    expect(testNode.a).toBe(1)

    dispose1()
    dispose2()
    dispose3()
  })

  it("should throw error if listener returns undefined", () => {
    const testNode = node<{ a: number }>({ a: 1 })

    const dispose = onDeepInterceptedChange(testNode, () => {
      // Intentionally return undefined (forgot to return)
      return undefined as any
    })

    // Should throw when listener returns undefined
    expect(() => {
      runInAction(() => {
        testNode.a = 100
      })
    }).toThrow("onDeepInterceptedChange listener must return either the change object or null")

    // Value should not have changed
    expect(testNode.a).toBe(1)

    dispose()
  })
})
