import { autorun, runInAction } from "mobx"
import { getChildrenNodes, nodeType } from "../../src"
import "../commonSetup"

describe("Lazy NodeData initialization", () => {
  test("reaction should properly track when children are added to initially empty childrenObjects", () => {
    type Parent = { children: Array<{ value: number }> }
    const TChild = nodeType<{ value: number }>().defaults({ value: () => 0 })
    const TParent = nodeType<Parent>().defaults({ children: () => [] })

    const parent = TParent({ children: [] })

    let reactionCount = 0
    let lastChildrenCount = 0

    const dispose = autorun(() => {
      const children = getChildrenNodes(parent.children)
      lastChildrenCount = children.size
      reactionCount++
    })

    expect(reactionCount).toBe(1)
    expect(lastChildrenCount).toBe(0)

    // Add a child to the array - this should trigger the reaction
    runInAction(() => {
      parent.children.push(TChild({ value: 1 }))
    })

    expect(reactionCount).toBe(2)
    expect(lastChildrenCount).toBe(1)

    // Remove a child
    runInAction(() => {
      parent.children.pop()
    })

    expect(reactionCount).toBe(3)
    expect(lastChildrenCount).toBe(0)

    dispose()
  })
})
