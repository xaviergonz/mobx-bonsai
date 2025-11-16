import { runInAction, set } from "mobx"
import { vi } from "vitest"
import { node, nodeType, onChildAttachedTo, TNode } from "../../../src"

it("should fire immediately for current children when fireForCurrentChildren is true", () => {
  const testNode = node({
    child1: { a: 1 },
  })
  const fired: object[] = []
  const disposer = onChildAttachedTo({
    target: () => testNode,
    childNodeType: undefined,
    onChildAttached: (child) => {
      fired.push(child)
    },
    fireForCurrentChildren: true,
  })
  // Expect immediate callback invocation for existing child.
  expect(fired).toStrictEqual([testNode.child1])
  fired.length = 0

  disposer(false)
})

it("should fire when a new child is added", () => {
  const testNode = node<{ child1?: { a: number }; child2?: { b: number } }>({
    child1: { a: 1 },
  })
  const fired: object[] = []
  const disposer = onChildAttachedTo({
    target: () => testNode,
    childNodeType: undefined,
    onChildAttached: (child) => {
      fired.push(child)
    },
    fireForCurrentChildren: false,
  })

  // Initially, no child since fireForCurrentChildren is false.
  expect(fired).toStrictEqual([])

  runInAction(() => {
    set(testNode, "child2", { b: 2 }) // use set() for MobX 4 compatibility
  })
  // Allow reaction to run.
  expect(fired).toStrictEqual([testNode.child2])
  fired.length = 0

  disposer(false)
})

it("should run detach disposer when a child is removed", () => {
  const testNode = node<{ child1?: { a: number } }>({
    child1: { a: 1 },
  })
  const detachFired: object[] = []
  const disposer = onChildAttachedTo({
    target: () => testNode,
    childNodeType: undefined,
    onChildAttached: (chDetached) => {
      return () => {
        detachFired.push(chDetached)
      }
    },
  })

  const child1 = testNode.child1

  runInAction(() => {
    testNode.child1 = undefined
  })
  // The detach disposer should be called when the child is removed.
  expect(detachFired).toStrictEqual([child1])

  disposer(false)
})

it("should stop further notifications after disposer is called", () => {
  const testNode = node<{ child1?: { a: number }; child2?: { b: number } }>({
    child1: { a: 1 },
  })
  let callCount = 0
  const disposer = onChildAttachedTo({
    target: () => testNode,
    childNodeType: undefined,
    onChildAttached: () => {
      callCount++
    },
    fireForCurrentChildren: true,
  })
  // Initial call count.
  expect(callCount).toBe(1)
  runInAction(() => {
    set(testNode, "child2", { b: 2 }) // use set() for MobX 4 compatibility
  })
  expect(callCount).toBe(2)

  disposer(false)

  runInAction(() => {
    set(testNode, "child2", { b: 3 }) // use set() for MobX 4 compatibility
  })
  expect(callCount).toBe(2)
})

it("should run pending detach disposers when disposer is called with true", () => {
  // Setup a node with two children.
  const testNode = node({
    child1: { a: 1 },
    child2: { b: 2 },
  })
  const detachCalls: object[] = []
  const disposer = onChildAttachedTo({
    target: () => testNode,
    childNodeType: undefined,
    onChildAttached: (child) => {
      // Return a detach disposer that records the child.
      return () => {
        detachCalls.push(child)
      }
    },
    fireForCurrentChildren: true,
  })

  // At this point, detach disposers for current children are pending.
  disposer(true) // Calling disposer with true should run pending detach disposers.
  expect(detachCalls).toEqual([testNode.child1, testNode.child2])
})

it("should fire for deep children when deep is set to true", () => {
  const testNode = node({
    child1: { a: 1, nested: { b: 2 } },
    child2: { c: 3 },
  })
  const fired: object[] = []
  const disposer = onChildAttachedTo({
    target: () => testNode,
    childNodeType: undefined,
    onChildAttached: (child) => {
      fired.push(child)
    },
    fireForCurrentChildren: true,
    deep: true,
  })
  // Expect the callback to run immediately for both shallow and nested children.
  expect(fired).toStrictEqual([testNode.child1, testNode.child1.nested, testNode.child2])
  disposer(false)
})

it("fires callback only for matching node using a selector", () => {
  type TMatch = TNode<"match", { id: number }>
  using tMatch = nodeType<TMatch>("match").withKey("id")

  type TOther = TNode<"other", { id: number }>
  using tOther = nodeType<TOther>("other").withKey("id")

  const testNode = node<{
    child1?: TMatch | TOther
    child2?: TMatch | TOther
  }>({}) // create an empty node

  const onChildAttached1 = vi.fn()
  const disposer1 = onChildAttachedTo({
    target: () => testNode,
    childNodeType: tMatch,
    onChildAttached: onChildAttached1,
    fireForCurrentChildren: false,
  })

  const onChildAttached2 = vi.fn()
  const disposer2 = onChildAttachedTo({
    target: () => testNode,
    childNodeType: tOther,
    onChildAttached: onChildAttached2,
    fireForCurrentChildren: false,
  })

  runInAction(() => {
    set(testNode, "child1", tMatch.snapshot({ id: 1 })) // use set() for MobX 4 compatibility
    set(testNode, "child2", tOther.snapshot({ id: 2 })) // use set() for MobX 4 compatibility
  })

  // Expect callback only for the matching children.
  expect(onChildAttached1).toHaveBeenCalledWith(testNode.child1)
  expect(onChildAttached2).toHaveBeenCalledWith(testNode.child2)
  disposer1(false)
  disposer2(false)
})
