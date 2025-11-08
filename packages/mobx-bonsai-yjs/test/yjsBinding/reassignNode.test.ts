import { runInAction, set, toJS } from "mobx"
import { nodeType, TNode } from "mobx-bonsai"
import { createObjectTestbed } from "./testbed"

test("reassign an already added object to another part of the tree should fail", () => {
  const { mobxObservable } = createObjectTestbed<{
    nestedObj1?: {
      numberProp: number
    }
    nestedObj2?: {
      numberProp: number
    }
  }>({ nestedObj1: { numberProp: 0 } })
  expect(() => {
    runInAction(() => {
      set(mobxObservable, "nestedObj2", mobxObservable.nestedObj1) // use set() for MobX 4 compatibility
    })
  }).toThrow(
    `The same node cannot appear twice in the same or different trees, trying to assign it to ["nestedObj2"], but it already exists at ["nestedObj1"]`
  )
})

test("reassign an added/removed object to another part of the tree should be ok", () => {
  const { mobxObservable } = createObjectTestbed<{
    nestedObj1?: {
      numberProp: number
    }
    nestedObj2?: {
      numberProp: number
    }
  }>({ nestedObj1: { numberProp: 0 } })
  const mobxNestedObj1 = mobxObservable.nestedObj1
  runInAction(() => {
    set(mobxObservable, "nestedObj1", undefined) // use set() for MobX 4 compatibility
    set(mobxObservable, "nestedObj2", mobxNestedObj1) // use set() for MobX 4 compatibility
  })
  expect(mobxObservable.nestedObj1).toBe(undefined)
  expect(mobxObservable.nestedObj2).toBe(mobxNestedObj1)
})

test("reassign a copy of an added object to another part of the tree should be ok", () => {
  const { mobxObservable } = createObjectTestbed<{
    nestedObj1?: {
      numberProp: number
    }
    nestedObj2?: {
      numberProp: number
    }
  }>({ nestedObj1: { numberProp: 0 } })
  const mobxNestedObj1 = mobxObservable.nestedObj1
  runInAction(() => {
    set(mobxObservable, "nestedObj2", toJS(mobxNestedObj1)) // use set() for MobX 4 compatibility
  })
  expect(mobxObservable.nestedObj1).toBe(mobxNestedObj1)
  expect(mobxObservable.nestedObj2).not.toBe(mobxNestedObj1)
  expect(mobxObservable.nestedObj2).toBeDefined()
})

test("swapping nodes in an array should be ok if we detach one first", () => {
  const { mobxObservable } = createObjectTestbed<
    (
      | {
          numberProp: number
        }
      | undefined
    )[]
  >([{ numberProp: 0 }, { numberProp: 1 }])

  const mobxNode1 = mobxObservable[0]
  const mobxNode2 = mobxObservable[1]
  runInAction(() => {
    mobxObservable[1] = undefined
    mobxObservable[0] = mobxNode2
    mobxObservable[1] = mobxNode1
  })
  expect(mobxObservable[0]).toBe(mobxNode2)
  expect(mobxObservable[1]).toBe(mobxNode1)
})

test("swapping unique nodes in an array should be ok if we detach one first", () => {
  type T1 = TNode<"1", { id: number; numberProp: number }>
  using t1 = nodeType<T1>("1").withKey("id")

  const { mobxObservable } = createObjectTestbed<(T1 | undefined)[]>([
    t1.snapshot({ id: 1, numberProp: 0 }),
    t1.snapshot({ id: 2, numberProp: 1 }),
  ])

  const mobxNode1 = mobxObservable[0]
  const mobxNode2 = mobxObservable[1]
  runInAction(() => {
    mobxObservable[1] = undefined
    mobxObservable[0] = mobxNode2
    mobxObservable[1] = mobxNode1
  })
  expect(mobxObservable[0]).toBe(mobxNode2)
  expect(mobxObservable[1]).toBe(mobxNode1)
})
