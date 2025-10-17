import { runInAction } from "mobx"
import * as Y from "yjs"
import { createObjectTestbed } from "./testbed"

test("transactions", () => {
  const { mobxObservable, yjsObject, yjsDoc } = createObjectTestbed<{
    numberProp: number
  }>({ numberProp: 0 })
  const yjsMap = yjsObject as Y.Map<any>

  // starting point
  expect(yjsMap.get("numberProp")).toBe(0)
  expect(mobxObservable.numberProp).toBe(0)

  // Y.js state should not update until a mobx action is done running
  runInAction(() => {
    mobxObservable.numberProp = 10
    expect(yjsMap.get("numberProp")).toBe(0) // not yet
  })
  expect(yjsMap.get("numberProp")).toBe(10)

  // mobx state should not update until a Y.js transaction is done running
  yjsDoc.transact(() => {
    yjsMap.set("numberProp", 20)
    expect(mobxObservable.numberProp).toBe(10) // not yet
  })
  expect(mobxObservable.numberProp).toBe(20)
})

test("transaction edge-cases", () => {
  const { mobxObservable, yjsObject, yjsDoc } = createObjectTestbed<{
    numberArray?: number[]
  }>({})
  const yjsMap = yjsObject as Y.Map<any>
  const getNumberArray = () => yjsMap.get("numberArray") as Y.Array<number> | undefined

  // starting point
  expect(getNumberArray()).toBe(undefined)
  expect(mobxObservable.numberArray).toBe(undefined)

  runInAction(() => {
    mobxObservable.numberArray = [1, 2]
    expect(getNumberArray()).toBe(undefined) // not yet
    mobxObservable.numberArray.push(3)
    expect(getNumberArray()).toBe(undefined) // not yet
    mobxObservable.numberArray = undefined
    expect(getNumberArray()).toBe(undefined) // not yet
    mobxObservable.numberArray = [4, 5]
    expect(getNumberArray()).toBe(undefined) // not yet
  })
  expect(getNumberArray()!.toJSON()).toStrictEqual([4, 5])

  runInAction(() => {
    mobxObservable.numberArray = undefined
  })

  yjsDoc.transact(() => {
    const arr = new Y.Array()
    yjsMap.set("numberArray", arr)
    expect(mobxObservable.numberArray).toStrictEqual(undefined) // not yet
    arr.insert(0, [1, 2])
    expect(mobxObservable.numberArray).toStrictEqual(undefined) // not yet
    arr.push([3])
    expect(mobxObservable.numberArray).toStrictEqual(undefined) // not yet
    yjsMap.delete("numberArray")
    expect(mobxObservable.numberArray).toStrictEqual(undefined) // not yet
    const arr2 = new Y.Array()
    yjsMap.set("numberArray", arr2)
    expect(mobxObservable.numberArray).toStrictEqual(undefined) // not yet
    arr2.insert(0, [4, 5])
    expect(mobxObservable.numberArray).toStrictEqual(undefined) // not yet
  })
  expect(mobxObservable.numberArray).toStrictEqual([4, 5])
})
