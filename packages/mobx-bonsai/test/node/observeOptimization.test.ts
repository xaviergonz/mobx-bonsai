import { runInAction, set } from "mobx"
import { node, nodeType, onDeepChange, TNode } from "../../src"
import { getNodeData } from "../../src/node/node"
import "../commonSetup"

function expectRefCount(nodeData: ReturnType<typeof getNodeData>, count: number) {
  expect(nodeData.ancestorChangeListenerRefCount).toBe(count)
  if (count === 0) {
    expect(nodeData.observeDisposer).toBeUndefined()
  } else {
    expect(nodeData.observeDisposer).toBeDefined()
  }
}

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
      set(parent, "child", { value: 1 }) // use set() for MobX 4 compatibility
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

  test("moving node between trees with different listener states", () => {
    const treeWithListener = node({ child: { value: 1 } })
    const treeWithoutListener = node<{ child?: { value: number } }>({})
    const child = treeWithListener.child
    const childData = getNodeData(child)

    // Add listener to first tree
    const disposer = onDeepChange(treeWithListener, () => {})

    expectRefCount(childData, 1)

    // Move child to tree without listener
    runInAction(() => {
      treeWithListener.child = undefined as any
      set(treeWithoutListener, "child", child) // use set() for MobX 4 compatibility
    })

    // Child should no longer have observe hook
    expectRefCount(childData, 0)

    // Now add listener to second tree
    const disposer2 = onDeepChange(treeWithoutListener, () => {})

    // Child should have observe hook again
    expectRefCount(childData, 1)

    disposer()
    disposer2()
  })

  test("moving node between two trees both with listeners", () => {
    const tree1 = node<{ child?: { value: number } }>({})
    const tree2 = node<{ child?: { value: number } }>({})
    const child = node({ value: 1 })
    const childData = getNodeData(child)

    const disposer1 = onDeepChange(tree1, () => {})
    const disposer2 = onDeepChange(tree2, () => {})

    // Attach to tree1
    runInAction(() => {
      set(tree1, "child", child) // use set() for MobX 4 compatibility
    })

    expectRefCount(childData, 1)

    // Move to tree2 (also has listener)
    runInAction(() => {
      tree1.child = undefined
      set(tree2, "child", child) // use set() for MobX 4 compatibility
    })

    // Should still have listener (from tree2)
    expectRefCount(childData, 1)

    disposer1()
    disposer2()
  })

  test("array splice operations maintain correct ref counts", () => {
    const parent = node({ items: [{ value: 1 }, { value: 2 }, { value: 3 }] })
    const item1 = parent.items[0]
    const item2 = parent.items[1]
    const item3 = parent.items[2]
    const disposer = onDeepChange(parent, () => {})

    const item1Data = getNodeData(item1)
    const item2Data = getNodeData(item2)
    const item3Data = getNodeData(item3)

    expectRefCount(item1Data, 1)
    expectRefCount(item2Data, 1)
    expectRefCount(item3Data, 1)

    // Splice out the middle item
    runInAction(() => {
      parent.items.splice(1, 1)
    })

    // Item 2 should be detached
    expectRefCount(item2Data, 0)

    // Items 1 and 3 should still have listeners
    expectRefCount(item1Data, 1)
    expectRefCount(item3Data, 1)

    disposer()
  })

  test("nested child replacement maintains ref counts", () => {
    const parent = node({ level1: { level2: { value: 1 } } })
    const oldLevel2 = parent.level1.level2
    const oldLevel2Data = getNodeData(oldLevel2)
    const disposer = onDeepChange(parent, () => {})

    expectRefCount(oldLevel2Data, 1)

    // Replace level2
    runInAction(() => {
      parent.level1.level2 = { value: 2 }
    })

    const newLevel2 = parent.level1.level2
    const newLevel2Data = getNodeData(newLevel2)

    // Old level2 should be detached
    expectRefCount(oldLevel2Data, 0)

    // New level2 should have listener
    expectRefCount(newLevel2Data, 1)

    disposer()
  })

  test("disposing listener during change event", () => {
    const parent = node({ value: 1 })
    const parentData = getNodeData(parent)
    let disposer: (() => void) | undefined

    disposer = onDeepChange(parent, () => {
      // Dispose the listener during the change event
      if (disposer) {
        disposer()
      }
    })

    expect(parentData.observeDisposer).toBeDefined()

    runInAction(() => {
      parent.value = 2
    })

    // Observer should be detached after disposal
    expectRefCount(parentData, 0)
  })

  test("deep nesting with intermediate listener additions", () => {
    const root = node({ a: { b: { c: { value: 1 } } } })
    const aData = getNodeData(root.a)
    const bData = getNodeData(root.a.b)
    const cData = getNodeData(root.a.b.c)

    // Add listener to root
    const disposer1 = onDeepChange(root, () => {})

    expectRefCount(aData, 1)
    expectRefCount(bData, 1)
    expectRefCount(cData, 1)

    // Add listener to intermediate node
    const disposer2 = onDeepChange(root.a.b, () => {})

    // b now has TWO sources of listeners: root and itself
    // c has TWO sources: root and b
    // a only has one: root
    expectRefCount(aData, 1)
    expectRefCount(bData, 2)
    expectRefCount(cData, 2)

    // Remove root listener
    disposer1()

    // b and c should still have listeners (from disposer2)
    expectRefCount(bData, 1)
    expectRefCount(cData, 1)
    // a should not have listeners
    expectRefCount(aData, 0)

    disposer2()

    // All should be clean
    expectRefCount(aData, 0)
    expectRefCount(bData, 0)
    expectRefCount(cData, 0)
  })

  test("complex tree restructuring", () => {
    const root = node({
      branch1: { leaf: { value: 1 } },
      branch2: {} as { leaf?: { value: number } },
    })
    const leaf = root.branch1.leaf
    const leafData = getNodeData(leaf)
    const disposer = onDeepChange(root, () => {})

    expectRefCount(leafData, 1)

    // Move leaf from branch1 to branch2
    runInAction(() => {
      root.branch1.leaf = undefined as any
      set(root.branch2, "leaf", leaf) // use set() for MobX 4 compatibility
    })

    // Should still have listener (still under root)
    expectRefCount(leafData, 1)

    disposer()
  })

  test("concurrent listener addition during tree modification", () => {
    const parent = node<{ child?: { value: number } }>({})
    const parentData = getNodeData(parent)
    let disposer2: (() => void) | undefined

    const disposer1 = onDeepChange(parent, () => {
      // Add another listener during the change event
      if (!disposer2) {
        disposer2 = onDeepChange(parent, () => {})
      }
    })

    expectRefCount(parentData, 1)

    // Trigger change
    runInAction(() => {
      set(parent, "child", { value: 1 }) // use set() for MobX 4 compatibility
    })

    // Should still have correct ref count
    expectRefCount(parentData, 1)

    disposer1()
    // Still one listener
    expectRefCount(parentData, 1)

    disposer2?.()
    // All listeners removed
    expectRefCount(parentData, 0)
  })

  test("listener on both parent and child - removal order", () => {
    const parent = node({ child: { value: 1 } })
    const child = parent.child
    const childData = getNodeData(child)

    const parentDisposer = onDeepChange(parent, () => {})
    const childDisposer = onDeepChange(child, () => {})

    // Child has 2 sources of listeners
    expectRefCount(childData, 2)

    // Remove child listener first
    childDisposer()
    expectRefCount(childData, 1)

    // Remove parent listener
    parentDisposer()
    expectRefCount(childData, 0)
  })

  test("node becomes root after detachment, then reattached", () => {
    const parent = node<{ child?: { value: number } }>({ child: { value: 1 } })
    const child = parent.child!
    const childData = getNodeData(child)
    const disposer = onDeepChange(parent, () => {})

    expectRefCount(childData, 1)

    // Detach child (becomes root)
    runInAction(() => {
      parent.child = undefined
    })

    expectRefCount(childData, 0)

    // Add listener to the now-root child
    const childDisposer = onDeepChange(child, () => {})

    expectRefCount(childData, 1)

    // Reattach to parent
    runInAction(() => {
      set(parent, "child", child) // use set() for MobX 4 compatibility
    })

    // Should have 2 sources now
    expectRefCount(childData, 2)

    childDisposer()
    expectRefCount(childData, 1)

    disposer()
    expectRefCount(childData, 0)
  })

  test("observer hook survives when ref count decrements but doesn't reach zero", () => {
    const root = node({ child: { value: 1 } })
    const child = root.child
    const childData = getNodeData(child)

    const rootDisposer = onDeepChange(root, () => {})
    const childDisposer = onDeepChange(child, () => {})

    expectRefCount(childData, 2)

    const observeDisposer = childData.observeDisposer

    // Remove one source
    rootDisposer()

    expectRefCount(childData, 1)
    // Should still have the SAME observer (not recreated)
    expect(childData.observeDisposer).toBe(observeDisposer)

    childDisposer()
  })

  test("node reconciliation: moving keyed node between trees with different listener states", () => {
    // When nodes have type+key, they are reconciled (reused) across different arrays/trees.
    // This test verifies that listener ref counts are updated correctly when a keyed node
    // is moved from one parent to another during reconciliation.
    const typedNode =
      nodeType<TNode<"testType1", { id: string; value: number }>>("testType1").withKey("id")

    // Create first array with listener
    const array1 = node([typedNode.snapshot({ id: "1", value: 1 })])
    const reconciledNode = array1[0]
    const nodeData = getNodeData(reconciledNode)

    const disposer1 = onDeepChange(array1, () => {})
    expectRefCount(nodeData, 1)

    // Create second array WITHOUT listener, but with same keyed node
    // The node will be reconciled (reused) and moved from array1 to array2
    const array2 = node([typedNode.snapshot({ id: "1", value: 2 })])

    // The node should be the same instance (reconciled), just with updated value
    expect(array2[0]).toBe(reconciledNode)
    expect(reconciledNode.value).toBe(2) // value was updated during reconciliation

    // Should no longer have listeners since it's now in array2 which has no listeners
    expectRefCount(nodeData, 0)

    disposer1()
  })

  test("node reconciliation: moving keyed node from tree without listener to tree with listener", () => {
    const typedNode =
      nodeType<TNode<"testType2", { id: string; value: number }>>("testType2").withKey("id")

    // Create first array WITHOUT listener
    const array1 = node([typedNode.snapshot({ id: "1", value: 1 })])
    const reconciledNode = array1[0]
    const nodeData = getNodeData(reconciledNode)

    expectRefCount(nodeData, 0)

    // Create second array WITH listener
    const array2 = node([typedNode.snapshot({ id: "1", value: 2 })])
    const disposer2 = onDeepChange(array2, () => {})

    // The node should be the same instance (reconciled), just with updated value
    expect(array2[0]).toBe(reconciledNode)
    expect(reconciledNode.value).toBe(2) // value was updated during reconciliation

    // Should now have listeners since it's in array2 which has a listener
    expectRefCount(nodeData, 1)

    disposer2()
  })
})
