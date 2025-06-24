import { configure, isObservable, observable, reaction, runInAction } from "mobx"
import { isNode, node, nodeType, TNode } from "../../src"

it("should convert a plain object into a node", () => {
  const obj = { a: 1, b: { c: 2 } }
  expect(isNode(obj)).toBe(false)

  const nObj = node(obj)
  expect(isNode(nObj)).toBe(true)
})

it("should automatically convert nested objects into nodes", () => {
  const obj = { a: 1, b: { c: 2 } }
  const nObj = node(obj)
  // Nested object b should be converted to a node
  expect(isNode(nObj.b)).toBe(true)
})

it("should return the same instance when the object is already a node", () => {
  const obj = { a: 1 }
  const nObj = node(obj)
  expect(node(nObj)).toBe(nObj)
})

it("an observable should keep the same ref when converted to a node", () => {
  const obj = observable({ a: 1 }, undefined, { deep: true })
  const nObj = node(obj)
  expect(node(nObj)).toBe(nObj)
})

it("should handle arrays and convert their items to nodes", () => {
  const arr = [{ value: 1 }, { value: 2 }]
  expect(isNode(arr)).toBe(false)

  const nArr = node(arr)
  expect(isNode(nArr)).toBe(true)
  nArr.forEach((item) => {
    expect(isNode(item)).toBe(true)
  })
})

it("should keep a detached child as a node, should keep the same reference when reattaching a child node", () => {
  const parent = node({ child: { x: 42 } } as { child?: { x: number } })
  const detachedChild = parent.child!
  runInAction(() => {
    parent.child = undefined
  })
  expect(isNode(detachedChild)).toBe(true)
  const parent2 = node({ child: {} })
  runInAction(() => {
    parent2.child = detachedChild // reattach
  })
  expect(parent2.child).toBe(detachedChild)
})

it("should convert a plain object assigned as a child into a node (changing the reference)", () => {
  const parent = node({} as { child?: { y: number } })
  const plainChild = { y: 100 }
  runInAction(() => {
    parent.child = plainChild // assign a plain object
  })
  expect(isObservable(parent.child!)).toBe(true)
  expect(isNode(parent.child!)).toBe(true)
  expect(parent.child).not.toBe(plainChild)
})

it("adding a plain object to an object should be a node", () => {
  const nObj = node<{ child?: { a: number } }>({})
  runInAction(() => {
    nObj.child = { a: 1 }
  })
  expect(isNode(nObj.child!)).toBe(true)
})

it("adding a plain object to an array should be a node", () => {
  const nArr = node<{ a: number }[]>([])
  runInAction(() => {
    nArr.push({ a: 1 })
  })
  expect(isNode(nArr[0])).toBe(true)

  runInAction(() => {
    nArr[1] = { a: 1 }
  })
  expect(isNode(nArr[1])).toBe(true)
})

it("setting a plain value of an existing unique node should result in a single reaction", () => {
  configure({ enforceActions: "never" })
  try {
    type TA2 = TNode<"a2", { id: string; a: number }>
    using tA2 = nodeType<TA2>("a2").withKey("id")

    const nodeData1 = tA2.snapshot({
      id: "1",
      a: 1,
    })
    const nObj1 = tA2(nodeData1)

    const nodeData2 = tA2.snapshot({
      id: "2",
      a: 2,
    })
    tA2(nodeData2)

    const nParent = node<{ nObj?: typeof nObj1 }>({})

    const events: any[] = []
    const disposer = reaction(
      () => nParent.nObj,
      (v) => {
        events.push([v?.a, isNode(v!)])
      }
    )

    nParent.nObj = nodeData1

    expect(events.length).toBe(1)
    events.length = 0

    nParent.nObj = nodeData2

    expect(events.length).toBe(1)
    events.length = 0

    disposer()
  } finally {
    configure({ enforceActions: "always" })
  }
})
