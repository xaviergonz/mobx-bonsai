import { runInAction } from "mobx"
import { node } from "../../src"
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
})
