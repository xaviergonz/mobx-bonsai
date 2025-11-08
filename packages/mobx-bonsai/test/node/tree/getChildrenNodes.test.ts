import { reaction, runInAction, set } from "mobx"
import { getChildrenNodes, node } from "../../../src"

it("should return shallow children for an object node", () => {
  const parent = node({
    child1: { a: 1 },
    child2: { b: 2 },
    primitive: "foo",
  })
  const children = getChildrenNodes(parent, { deep: false })
  // Only child1 and child2 are node children.
  expect(children.size).toBe(2)
  expect(children.has(parent.child1)).toBe(true)
  expect(children.has(parent.child2)).toBe(true)
})

it("should return deep children for an object node", () => {
  const parent = node({
    child1: { a: 1 },
    child2: { b: 2, grandchild: { c: 3 } },
    primitive: "foo",
  })
  const children = getChildrenNodes(parent, { deep: true })
  // Expected children: child1, child2, and child2.grandchild.
  expect(children.size).toBe(3)
  expect(children.has(parent.child1)).toBe(true)
  expect(children.has(parent.child2)).toBe(true)
  expect(children.has(parent.child2.grandchild)).toBe(true)
})

it("should return shallow children for an array node", () => {
  const arr = node<any>([{ a: 1 }, "primitive", { b: 2 }])
  const children = getChildrenNodes(arr, { deep: false })
  // Only the objects are node children.
  expect(children.size).toBe(2)
  expect(children.has(arr[0])).toBe(true)
  expect(children.has(arr[2])).toBe(true)
})

it("should return deep children for an array node", () => {
  const arr = node<any>([{ a: 1, nested: { c: 3 } }, "primitive", [{ d: 4 }]])
  const children = getChildrenNodes(arr, { deep: true })
  // Expected children: arr[0], arr[0].nested, arr[2] (the inner array), and inner array element.
  expect(children.size).toBe(4)
  expect(children.has(arr[0])).toBe(true)
  expect(children.has(arr[0].nested)).toBe(true)
  expect(children.has(arr[2])).toBe(true)
  expect(children.has(arr[2][0])).toBe(true)
})

it("should react when a child is added/removed", () => {
  const root = node<{ child1?: { a: number }; child2?: { b: number } }>({ child1: { a: 1 } })

  const children: object[] = []
  const disposer = reaction(
    () => [...getChildrenNodes(root, { deep: false })],
    (ch) => {
      children.push(ch)
    },
    { fireImmediately: true }
  )

  // Initially, one child exists.
  expect(children).toMatchInlineSnapshot(`
[
  [
    {
      "a": 1,
    },
  ],
]
`)
  children.length = 0

  runInAction(() => {
    set(root, "child2", { b: 2 }) // use set() for MobX 4 compatibility
  })

  // Reaction should pick up the change.
  expect(children).toMatchInlineSnapshot(`
[
  [
    {
      "a": 1,
    },
    {
      "b": 2,
    },
  ],
]
`)
  children.length = 0

  runInAction(() => {
    set(root, "child2", undefined) // use set() for MobX 4 compatibility
  })

  expect(children).toMatchInlineSnapshot(`
[
  [
    {
      "a": 1,
    },
  ],
]
`)
  children.length = 0

  disposer()
})

it("reference stability", () => {
  const root = node<{ child1?: { a: number }; child2?: { b: number } }>({ child1: { a: 1 } })

  // shallow reference should be stable when no changes and NOT observed
  expect(getChildrenNodes(root, { deep: false })).toBe(getChildrenNodes(root, { deep: false }))
  // deep reference should NOT be stable when no changes and NOT observed
  expect(getChildrenNodes(root, { deep: true })).not.toBe(getChildrenNodes(root, { deep: true }))

  const disposer = reaction(
    () => [getChildrenNodes(root, { deep: false }), getChildrenNodes(root, { deep: true })],
    () => {}
  )

  // reference should be stable when no changes and observed
  expect(getChildrenNodes(root, { deep: false })).toBe(getChildrenNodes(root, { deep: false }))
  expect(getChildrenNodes(root, { deep: true })).toBe(getChildrenNodes(root, { deep: true }))

  disposer()
})
