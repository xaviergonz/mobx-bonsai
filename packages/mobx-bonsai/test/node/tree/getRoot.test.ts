import { reaction, runInAction, set } from "mobx"
import { getRoot, node } from "../../../src"

it("should return the node itself when it is the root (object)", () => {
  const root = node({ a: 1 })
  expect(getRoot(root)).toBe(root)
})

it("should return the root for a nested object node", () => {
  const root = node({ child: { a: 1 } })
  const child = root.child
  expect(getRoot(child)).toBe(root)
})

it("should return the root from a multi-level nested object", () => {
  const root = node({ child: { grandchild: { a: 1 } } })
  expect(getRoot(root.child.grandchild)).toBe(root)
})

it("should return the node itself when it is the root (array)", () => {
  const arr = node([{ a: 1 }])
  expect(getRoot(arr)).toBe(arr)
})

it("should return the root array for an element in an array", () => {
  const arr = node([{ a: 1 }])
  const element = arr[0]
  expect(getRoot(element)).toBe(arr)
})

it("should update the root when a child node is moved", () => {
  type N = { child?: { a: number } }
  const root1 = node<N>({ child: { a: 1 } })
  const root2 = node<N>({})
  const child = root1.child!
  runInAction(() => {
    root1.child = undefined // detach child from root1
  })
  runInAction(() => {
    set(root2, "child", child) // use set() for MobX 4 compatibility
  })
  expect(getRoot(child)).toBe(root2)
})

it("should react to changes in root assignment", () => {
  type N = { child?: { a: number } }
  const root1 = node<N>({ child: { a: 1 } })
  const root2 = node<N>({})
  const child = root1.child!

  const childRoots: unknown[] = []
  reaction(
    () => getRoot(child),
    (newRoot) => {
      childRoots.push(newRoot)
    }
  )

  // Initially, child is under root1.
  expect(getRoot(child)).toBe(root1)

  runInAction(() => {
    root1.child = undefined // detach child: now child's root is itself
  })
  expect(childRoots).toStrictEqual([child])
  childRoots.length = 0

  runInAction(() => {
    set(root2, "child", child) // use set() for MobX 4 compatibility
  })
  expect(childRoots).toStrictEqual([root2])
  childRoots.length = 0
})
