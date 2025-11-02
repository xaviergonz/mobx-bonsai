import { runInAction } from "mobx"
import { node, onDeepChange, onDeepInterceptedChange } from "../../src"
import { getNodeData } from "../../src/node/node"
import "../commonSetup"

describe("observe hook optimization", () => {
  test("observe hook is not attached initially", () => {
    const testNode = node({ a: 1, b: 2 })
    const nodeData = getNodeData(testNode)

    // Should not have observe hook attached
    expect(nodeData.observeDisposer).toBeUndefined()
    expect(nodeData.ancestorChangeListenerRefCount).toBe(0)
  })

  test("observe hook is attached when onChangeListener is added", () => {
    const testNode = node({ a: 1, b: 2 })
    const nodeData = getNodeData(testNode)

    expect(nodeData.observeDisposer).toBeUndefined()

    const disposer = onDeepChange(testNode, () => {})

    // Should now have observe hook attached
    expect(nodeData.observeDisposer).toBeDefined()
    expect(nodeData.ancestorChangeListenerRefCount).toBe(1)

    disposer()
  })

  test("observe hook is detached when last onChangeListener is removed", () => {
    const testNode = node({ a: 1, b: 2 })
    const nodeData = getNodeData(testNode)

    const disposer1 = onDeepChange(testNode, () => {})
    const disposer2 = onDeepChange(testNode, () => {})

    expect(nodeData.observeDisposer).toBeDefined()
    expect(nodeData.ancestorChangeListenerRefCount).toBe(1)

    // Remove first listener - should still be attached
    disposer1()
    expect(nodeData.observeDisposer).toBeDefined()
    expect(nodeData.ancestorChangeListenerRefCount).toBe(1)

    // Remove second listener - should be detached
    disposer2()
    expect(nodeData.observeDisposer).toBeUndefined()
    expect(nodeData.ancestorChangeListenerRefCount).toBe(0)
  })

  test("observe hook still fires change events correctly", () => {
    const testNode = node({ a: 1, b: 2 })
    const events: any[] = []

    const disposer = onDeepChange(testNode, (change) => {
      events.push(change)
    })

    runInAction(() => {
      testNode.a = 10
    })

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe("update")
    expect(events[0].name).toBe("a")
    expect(events[0].newValue).toBe(10)

    disposer()
  })

  test("child nodes inherit ancestor listener ref count", () => {
    const parent = node({
      child: { value: 1 },
    })

    const parentData = getNodeData(parent)
    const childData = getNodeData(parent.child)

    // Initially no listeners
    expect(parentData.ancestorChangeListenerRefCount).toBe(0)
    expect(childData.ancestorChangeListenerRefCount).toBe(0)
    expect(childData.observeDisposer).toBeUndefined()

    // Add listener to parent
    const disposer = onDeepChange(parent, () => {})

    // Both parent and child should have ref count incremented
    expect(parentData.ancestorChangeListenerRefCount).toBe(1)
    expect(childData.ancestorChangeListenerRefCount).toBe(1)

    // Both should have observe hooks
    expect(parentData.observeDisposer).toBeDefined()
    expect(childData.observeDisposer).toBeDefined()

    // Remove listener
    disposer()

    // Both should have ref count back to 0
    expect(parentData.ancestorChangeListenerRefCount).toBe(0)
    expect(childData.ancestorChangeListenerRefCount).toBe(0)

    // Both should have observe hooks removed
    expect(parentData.observeDisposer).toBeUndefined()
    expect(childData.observeDisposer).toBeUndefined()
  })

  test("child added to tree with listener gets observe hook", () => {
    const parent = node<{ child?: { value: number } }>({})

    const disposer = onDeepChange(parent, () => {})

    const parentData = getNodeData(parent)
    expect(parentData.observeDisposer).toBeDefined()

    // Add child
    runInAction(() => {
      parent.child = { value: 1 }
    })

    const childData = getNodeData(parent.child!)
    expect(childData.ancestorChangeListenerRefCount).toBe(1)
    expect(childData.observeDisposer).toBeDefined()

    disposer()
  })

  test("child removed from tree with listener loses observe hook", () => {
    const parent = node({
      child: { value: 1 },
    })

    const child = parent.child
    const childData = getNodeData(child)

    const disposer = onDeepChange(parent, () => {})

    expect(childData.ancestorChangeListenerRefCount).toBe(1)
    expect(childData.observeDisposer).toBeDefined()

    // Remove child
    runInAction(() => {
      parent.child = undefined as any
    })

    expect(childData.ancestorChangeListenerRefCount).toBe(0)
    expect(childData.observeDisposer).toBeUndefined()

    disposer()
  })

  test("frozen nodes never get observe hooks", () => {
    const testNode = node({ a: 1, b: 2 })
    const nodeData = getNodeData(testNode)

    // Frozen nodes don't get observe hooks even with listeners
    if (nodeData.frozen) {
      const disposer = onDeepChange(testNode, () => {})

      expect(nodeData.observeDisposer).toBeUndefined()
      expect(nodeData.ancestorChangeListenerRefCount).toBe(1)

      disposer()
    }
  })

  test("rapid listener add/remove cycles work correctly", () => {
    const testNode = node({ a: 1, b: 2 })
    const nodeData = getNodeData(testNode)

    for (let i = 0; i < 10; i++) {
      const disposer = onDeepChange(testNode, () => {})
      expect(nodeData.observeDisposer).toBeDefined()
      expect(nodeData.ancestorChangeListenerRefCount).toBe(1)

      disposer()
      expect(nodeData.observeDisposer).toBeUndefined()
      expect(nodeData.ancestorChangeListenerRefCount).toBe(0)
    }
  })

  test("array nodes get observe hook optimization", () => {
    const testNode = node([1, 2, 3])
    const nodeData = getNodeData(testNode)

    expect(nodeData.observeDisposer).toBeUndefined()

    const disposer = onDeepChange(testNode, () => {})

    expect(nodeData.observeDisposer).toBeDefined()
    expect(nodeData.ancestorChangeListenerRefCount).toBe(1)

    disposer()

    expect(nodeData.observeDisposer).toBeUndefined()
    expect(nodeData.ancestorChangeListenerRefCount).toBe(0)
  })

  test("listener on child does not affect parent observe hook", () => {
    const parent = node({
      child: { value: 1 },
    })

    const parentData = getNodeData(parent)
    const childData = getNodeData(parent.child)

    // Add listener to child only
    const disposer = onDeepChange(parent.child, () => {})

    // Child should have observe hook
    expect(childData.observeDisposer).toBeDefined()
    expect(childData.ancestorChangeListenerRefCount).toBe(1)

    // Parent should NOT have observe hook (no listeners on it or ancestors)
    expect(parentData.observeDisposer).toBeUndefined()
    expect(parentData.ancestorChangeListenerRefCount).toBe(0)

    disposer()
  })
})
