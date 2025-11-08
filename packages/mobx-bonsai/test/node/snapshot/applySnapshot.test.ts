import { reaction, toJS } from "mobx"
import { applySnapshot, node, nodeType, nodeTypeKey, TNode } from "../../../src"

test("applies snapshot to an array node", () => {
  const n = node([1, 2, 3])
  const snapshot = [4, 5, 6]
  applySnapshot(n, snapshot)
  expect(toJS(n)).toStrictEqual(snapshot) // use toJS() for MobX 4 compatibility
})

test("throws error if snapshot is array but node is not", () => {
  const n = node({ a: 1 })
  const snapshot = [4, 5, 6]
  expect(() => applySnapshot(n, snapshot as any)).toThrow("target must be an array")
})

test("applies snapshot to an observable object with matching type and key", () => {
  type TA = TNode<"A", { id: string; value: number; arr?: number[]; obj?: { a: number } }>
  using tA = nodeType<TA>("A").withKey("id")

  const n = tA({
    id: "1",
    value: 10,
  })

  const snapshot = tA.snapshot({
    id: "1",
    value: 20,
    arr: [1, 2, 3],
    obj: { a: 1 },
  })
  applySnapshot(n, snapshot)
  expect(toJS(n)).toStrictEqual(snapshot) // use toJS() for MobX 4 compatibility
})

test("throws error if snapshot changes the type property", () => {
  type TA = TNode<"A", { id: string; value: number }>
  using tA = nodeType<TA>("A").withKey("id")

  type TB = TNode<"B", { id: string; value: number }>
  using tB = nodeType<TB>("B").withKey("id")

  const n = tA({
    id: "1",
    value: 10,
  })
  const snapshot = tB.snapshot({
    // changed type
    id: "1",
    value: 20,
  })
  expect(() => applySnapshot(n, snapshot as any)).toThrow(
    `applySnapshot does not allow changes to the '${nodeTypeKey}' property of the node the snapshot is being applied to`
  )
})

test("throws error if snapshot changes the key property", () => {
  type TA = TNode<"A", { id: string; value: number }>
  using tA = nodeType<TA>("A").withKey("id")

  const n = tA({
    id: "1",
    value: 10,
  })
  const snapshot = tA.snapshot({
    id: "2", // changed key
    value: 20,
  })
  expect(() => applySnapshot(n, snapshot)).toThrow(
    `applySnapshot does not allow changes to the 'id' property of the node the snapshot is being applied to`
  )
})

test("throws error if snapshot is a Map", () => {
  const n = node({})
  const snapshot = new Map()
  expect(() => applySnapshot(n, snapshot as any)).toThrow("must not contain maps")
})

test("throws error if snapshot is a Set", () => {
  const n = node({})
  const snapshot = new Set()
  expect(() => applySnapshot(n, snapshot as any)).toThrow("must not contain sets")
})

test("can swap unique objects around", () => {
  type T1 = TNode<"1", { id: number; n: number }>
  type TestBed = { a?: T1; b?: T1 }

  using t1 = nodeType<T1>("1").withKey("id")

  const initial: TestBed = {
    a: t1.snapshot({ id: 1, n: 0 }),
    b: t1.snapshot({ id: 2, n: 1 }),
  } as const

  const n = node(initial)
  const n1 = n.a!
  const n2 = n.b!

  // swap
  applySnapshot(n, {
    a: initial.b,
    b: initial.a,
  })

  expect(n).toStrictEqual({ a: n2, b: n1 })

  // swap back
  applySnapshot(n, {
    a: initial.a,
    b: initial.b,
  })

  expect(n).toStrictEqual({ a: n1, b: n2 })
})

test("preserves object reference when applying snapshot to nested object", () => {
  const n = node({ a: { b: 3 } })
  const originalRef = n.a

  // Set up a reaction to track if n.a reference changes
  let refChangeCount = 0
  const dispose = reaction(
    () => n.a,
    () => {
      refChangeCount++
    }
  )

  // Apply a new snapshot to the nested object
  applySnapshot(n, { a: { b: 4 } })

  // The reference should be preserved (reaction should not trigger)
  expect(n.a).toBe(originalRef)
  expect(n.a.b).toBe(4)
  expect(refChangeCount).toBe(0)

  dispose()
})

test("preserves object reference with typed nodes when applying snapshot to nested object", () => {
  type TInner = TNode<"Inner", { value: number }>
  using tInner = nodeType<TInner>("Inner")

  type TOuter = TNode<"Outer", { nested: TInner }>
  using tOuter = nodeType<TOuter>("Outer")

  const n = tOuter({ nested: tInner({ value: 10 }) })
  const originalNestedRef = n.nested

  // Set up a reaction to track if n.nested reference changes
  let refChangeCount = 0
  const dispose = reaction(
    () => n.nested,
    () => {
      refChangeCount++
    }
  )

  // Apply a new snapshot to the outer object with updated nested value
  applySnapshot(n, tOuter.snapshot({ nested: tInner.snapshot({ value: 20 }) }))

  // The nested object reference should be preserved (reaction should not trigger)
  expect(n.nested).toBe(originalNestedRef)
  expect(n.nested.value).toBe(20)
  expect(refChangeCount).toBe(0)

  dispose()
})

test("preserves object reference when applying snapshot to object inside array", () => {
  const n = node([{ a: 1 }])
  const originalRef = n[0]

  // Set up a reaction to track if n[0] reference changes
  let refChangeCount = 0
  const dispose = reaction(
    () => n[0],
    () => {
      refChangeCount++
    }
  )

  // Apply a new snapshot with updated object in array
  applySnapshot(n, [{ a: 2 }])

  // The reference should be preserved (reaction should not trigger)
  expect(n[0]).toBe(originalRef)
  expect(n[0].a).toBe(2)
  expect(refChangeCount).toBe(0)

  dispose()
})

test("preserves object references with typed nodes when applying snapshot to objects inside array", () => {
  type TItem = TNode<"Item", { id: number; value: string }>
  using tItem = nodeType<TItem>("Item").withKey("id")

  const n = node([tItem({ id: 1, value: "a" }), tItem({ id: 2, value: "b" })])
  const originalRef0 = n[0]
  const originalRef1 = n[1]

  // Set up reactions to track if n[0] and n[1] references change
  let refChangeCount0 = 0
  let refChangeCount1 = 0
  const dispose0 = reaction(
    () => n[0],
    () => {
      refChangeCount0++
    }
  )
  const dispose1 = reaction(
    () => n[1],
    () => {
      refChangeCount1++
    }
  )

  // Apply a new snapshot with updated values
  applySnapshot(n, [
    tItem.snapshot({ id: 1, value: "updated-a" }),
    tItem.snapshot({ id: 2, value: "updated-b" }),
  ])

  // The references should be preserved (reactions should not trigger)
  expect(n[0]).toBe(originalRef0)
  expect(n[0].value).toBe("updated-a")
  expect(n[1]).toBe(originalRef1)
  expect(n[1].value).toBe("updated-b")
  expect(refChangeCount0).toBe(0)
  expect(refChangeCount1).toBe(0)

  dispose0()
  dispose1()
})

test("replaces object reference when nested object has different type", () => {
  type TInner1 = TNode<"Inner1", { value: number }>
  using tInner1 = nodeType<TInner1>("Inner1")

  type TInner2 = TNode<"Inner2", { value: number }>
  using tInner2 = nodeType<TInner2>("Inner2")

  type TOuter = TNode<"Outer", { nested: TInner1 | TInner2 }>
  using tOuter = nodeType<TOuter>("Outer")

  const n = tOuter({ nested: tInner1({ value: 10 }) })
  const originalNestedRef = n.nested

  // Set up a reaction to track if n.nested reference changes
  let refChangeCount = 0
  const dispose = reaction(
    () => n.nested,
    () => refChangeCount++
  )

  // Apply a new snapshot with a different type for nested
  applySnapshot(n, tOuter.snapshot({ nested: tInner2.snapshot({ value: 20 }) }))

  // The reference should change (reaction should trigger)
  expect(n.nested).not.toBe(originalNestedRef)
  expect(n.nested.value).toBe(20)
  expect(refChangeCount).toBe(1)

  dispose()
})

test("replaces object reference when nested object in array has different type", () => {
  type TItem1 = TNode<"Item1", { value: string }>
  using tItem1 = nodeType<TItem1>("Item1")

  type TItem2 = TNode<"Item2", { value: string }>
  using tItem2 = nodeType<TItem2>("Item2")

  const n = node<Array<TItem1 | TItem2>>([tItem1({ value: "a" })])
  const originalRef = n[0]

  // Set up a reaction to track if n[0] reference changes
  let refChangeCount = 0
  const dispose = reaction(
    () => n[0],
    () => refChangeCount++
  )

  // Apply a new snapshot with a different type
  applySnapshot(n, [tItem2.snapshot({ value: "b" })])

  // The reference should change (reaction should trigger)
  expect(n[0]).not.toBe(originalRef)
  expect(n[0].value).toBe("b")
  expect(refChangeCount).toBe(1)

  dispose()
})

test("replaces object reference when nested object has different key", () => {
  type TInner = TNode<"Inner", { id: number; value: number }>
  using tInner = nodeType<TInner>("Inner").withKey("id")

  type TOuter = TNode<"Outer", { nested: TInner }>
  using tOuter = nodeType<TOuter>("Outer")

  const n = tOuter({ nested: tInner({ id: 1, value: 10 }) })
  const originalNestedRef = n.nested

  // Set up a reaction to track if n.nested reference changes
  let refChangeCount = 0
  const dispose = reaction(
    () => n.nested,
    () => refChangeCount++
  )

  // Apply a new snapshot with a different key
  applySnapshot(n, tOuter.snapshot({ nested: tInner.snapshot({ id: 2, value: 20 }) }))

  // The reference should change (reaction should trigger)
  expect(n.nested).not.toBe(originalNestedRef)
  expect(n.nested.id).toBe(2)
  expect(n.nested.value).toBe(20)
  expect(refChangeCount).toBe(1)

  dispose()
})
