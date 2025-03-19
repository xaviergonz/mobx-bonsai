import { runInAction } from "mobx"
import { asReduxStore, getSnapshot, node } from "../../src"

test("asReduxStore", () => {
  const target = node({ test: "value" })
  const store = asReduxStore(target)

  expect(store).toBeDefined()
  expect(store.getState()).toBe(getSnapshot(target))

  let runs = 0

  const dispose = store.subscribe((snapshot) => {
    runs++
    expect(snapshot).toBe(getSnapshot(target))
  })

  expect(runs).toBe(0)
  runInAction(() => {
    target.test = "new value"
  })
  expect(runs).toBe(1)

  dispose()
})
