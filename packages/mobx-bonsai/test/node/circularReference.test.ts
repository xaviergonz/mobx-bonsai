import { runInAction } from "mobx"
import { node, nodeType, TNode } from "../../src"
import { setGlobalConfig } from "../../src/globalConfig"
import "../commonSetup"

describe("circular reference behavior", () => {
  beforeAll(() => {
    // Ensure circular reference check is enabled for these tests
    setGlobalConfig({ checkCircularReferences: true })
  })

  test("simple circular reference between two nodes", () => {
    type NodeType = { value: number; next?: NodeType }
    const nodeA = node<NodeType>({ value: 1 })
    const nodeB = node<NodeType>({ value: 2 })

    runInAction(() => {
      nodeA.next = nodeB
    })

    // Try to create circular reference - should throw
    expect(() => {
      runInAction(() => {
        nodeB.next = nodeA
      })
    }).toThrow(/Cannot create a circular reference/)
  })

  test("circular reference in a longer chain (A -> B -> C -> A)", () => {
    type NodeType = { value: number; next?: NodeType }
    const nodeA = node<NodeType>({ value: 1 })
    const nodeB = node<NodeType>({ value: 2 })
    const nodeC = node<NodeType>({ value: 3 })

    runInAction(() => {
      nodeA.next = nodeB
      nodeB.next = nodeC
    })

    // Try to close the loop - should throw
    expect(() => {
      runInAction(() => {
        nodeC.next = nodeA
      })
    }).toThrow(/Cannot create a circular reference/)
  })

  test("self-reference (node points to itself)", () => {
    type NodeType = { value: number; next?: NodeType }
    const node1 = node<NodeType>({ value: 1 })

    // Try to make node point to itself - should throw
    expect(() => {
      runInAction(() => {
        node1.next = node1
      })
    }).toThrow(/Cannot create a circular reference/)
  })

  test("circular reference through array", () => {
    type NodeType = { value: number; children: NodeType[] }
    const parent = node<NodeType>({ value: 1, children: [] })
    const child = node<NodeType>({ value: 2, children: [] })

    runInAction(() => {
      parent.children.push(child)
    })

    // Try to make child point back to parent - should throw
    expect(() => {
      runInAction(() => {
        child.children.push(parent)
      })
    }).toThrow(/Cannot create a circular reference/)
  })

  test("circular reference with keyed nodes using snapshots", () => {
    // This test covers the case where node(v) returns a reconciled keyed node
    type Person = TNode<"person", { id: string; friend?: Person }>
    using TPerson = nodeType<Person>("person").withKey("id")

    // Create two keyed nodes
    const alice = TPerson({ id: "alice" })
    const bob = TPerson({ id: "bob" })

    // alice -> bob
    runInAction(() => {
      alice.friend = bob
    })

    // bob is now a child of alice
    // Now try to make bob.friend = alice (via snapshot that includes friend)
    // The snapshot includes bob in alice.friend, so reconciliation won't remove it
    // This would create: alice -> bob -> alice (cycle)
    expect(() => {
      runInAction(() => {
        bob.friend = TPerson.snapshot({
          id: "alice",
          friend: TPerson.snapshot({ id: "bob" }),
        })
      })
    }).toThrow(/Cannot create a circular reference/)
  })

  test("keyed node reconciliation without circular reference", () => {
    // When the snapshot doesn't include the friend property,
    // reconciliation will remove it, so there's no circular reference
    type Person = TNode<"person", { id: string; friend?: Person }>
    using TPerson = nodeType<Person>("person").withKey("id")

    const alice = TPerson({ id: "alice" })
    const bob = TPerson({ id: "bob" })

    // alice -> bob
    runInAction(() => {
      alice.friend = bob
    })

    // This should NOT throw because the snapshot { id: "alice" } will cause
    // reconciliation to remove alice.friend, breaking the cycle before attachment
    runInAction(() => {
      bob.friend = TPerson.snapshot({ id: "alice" })
    })

    // Verify the final state: bob -> alice (no cycle)
    expect(bob.friend).toBe(alice)
    expect(alice.friend).toBeUndefined()
  })

  test("keyed node auto-move - reconciled node already in tree", () => {
    // When assigning a snapshot that reconciles to an existing keyed node,
    // the node is automatically moved to the new location
    type Item = TNode<"item", { id: string; value: number }>
    using TItem = nodeType<Item>("item").withKey("id")

    // Create a container with a keyed node
    const container1 = node({ items: [TItem({ id: "item1", value: 1 })] })
    const item1 = container1.items[0]

    // Create another container
    const container2 = node({ items: [] as Item[] })

    // Assign a snapshot that will reconcile to the existing item1
    // The keyed node is automatically moved from container1 to container2
    runInAction(() => {
      container2.items.push(TItem.snapshot({ id: "item1", value: 2 }))
    })

    // Verify the node moved to container2 and was updated
    expect(container2.items[0]).toBe(item1)
    expect(item1.value).toBe(2)
    // The old location gets set to undefined (array elements aren't removed, just set to undefined)
    expect(container1.items.length).toBe(1)
    expect(container1.items[0]).toBeUndefined()
  })

  test("direct node assignment to two locations should throw error", () => {
    // When directly assigning the same node instance to two locations,
    // it should throw an error (not auto-detach)
    type Item = { value: number }

    // Create a node
    const item1 = node<Item>({ value: 1 })
    const container1 = node({ items: [item1] })

    // Create another container and try to assign the same node instance
    const container2 = node({ items: [] as Item[] })

    // This should throw because we're directly assigning the same node instance
    expect(() => {
      runInAction(() => {
        container2.items.push(item1)
      })
    }).toThrow(/The same node cannot appear twice in the same or different trees/)

    // Verify item1 is still in its original location
    expect(container1.items[0]).toBe(item1)
    expect(container2.items.length).toBe(0)
  })
})
