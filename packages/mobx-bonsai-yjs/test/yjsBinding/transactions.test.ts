import { runInAction, set, toJS } from "mobx"
import * as Y from "yjs"
import { bindYjsToNode } from "../../src"
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
    set(mobxObservable, "numberArray", [1, 2]) // use set() for MobX 4 compatibility
    expect(getNumberArray()).toBe(undefined) // not yet
    mobxObservable.numberArray!.push(3)
    expect(getNumberArray()).toBe(undefined) // not yet
    set(mobxObservable, "numberArray", undefined) // use set() for MobX 4 compatibility
    expect(getNumberArray()).toBe(undefined) // not yet
    set(mobxObservable, "numberArray", [4, 5]) // use set() for MobX 4 compatibility
    expect(getNumberArray()).toBe(undefined) // not yet
  })
  expect(getNumberArray()!.toJSON()).toStrictEqual([4, 5])

  runInAction(() => {
    set(mobxObservable, "numberArray", undefined) // use set() for MobX 4 compatibility
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
  // Note: In MobX 4, observable arrays need toJS() for proper comparison
  expect(toJS(mobxObservable.numberArray)).toStrictEqual([4, 5])
})

test("transactions with symbol getter function", () => {
  const yjsDoc = new Y.Doc()
  const yjsObject = yjsDoc.getMap("data") as Y.Map<any>

  // Set up initial data
  yjsObject.set("value", 0)

  const symbol1 = Symbol("origin1")
  const symbol2 = Symbol("origin2")
  let useSymbol1 = true
  const symbolGetter = () => (useSymbol1 ? symbol1 : symbol2)

  // Set up transaction observer to capture origins
  const capturedOrigins: unknown[] = []
  const transactionObserver = (transaction: Y.Transaction) => {
    capturedOrigins.push(transaction.origin)
  }
  yjsDoc.on("afterTransaction", transactionObserver)

  // Create binding with symbol getter function
  const { node: mobxObservable, dispose } = bindYjsToNode<{ value: number }>({
    yjsDoc,
    yjsObject,
    yjsOrigin: symbolGetter,
  })

  try {
    expect(mobxObservable.value).toBe(0)

    // Clear any setup transactions
    capturedOrigins.length = 0

    // Do a MobX operation while useSymbol1 = true
    runInAction(() => {
      mobxObservable.value = 10
    })

    // The transaction should have been issued with symbol1
    expect(capturedOrigins).toEqual([symbol1])

    // Clear captured origins
    capturedOrigins.length = 0

    // Switch to symbol2
    useSymbol1 = false

    // Do another MobX operation while useSymbol1 = false
    runInAction(() => {
      mobxObservable.value = 20
    })

    // The transaction should have been issued with symbol2
    expect(capturedOrigins).toEqual([symbol2])

    // Verify the Y.js state was updated
    expect(yjsObject.get("value")).toBe(20)
  } finally {
    yjsDoc.off("afterTransaction", transactionObserver)
    dispose()
  }
})
