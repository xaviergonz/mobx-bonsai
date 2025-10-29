import { runInAction } from "mobx"
import { nodeType } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"

describe("UndoManager - Grouping Debounce", () => {
  type Counter = {
    value: number
  }

  const TCounter = nodeType<Counter>().defaults({
    value: () => 0,
  })

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  test("should group changes within debounce window", async () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({
      rootNode: counter,
      groupingDebounceMs: 100,
    })

    runInAction(() => {
      counter.value = 1
    })
    await sleep(50)
    runInAction(() => {
      counter.value = 2
    })

    expect(manager.undoLevels).toBe(1)
    manager.undo()
    expect(counter.value).toBe(0)

    manager.dispose()
  })

  test("should create separate events outside debounce window", async () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({
      rootNode: counter,
      groupingDebounceMs: 100,
    })

    runInAction(() => {
      counter.value = 1
    })
    await sleep(150)
    runInAction(() => {
      counter.value = 2
    })

    expect(manager.undoLevels).toBe(2)

    manager.dispose()
  })

  test("should not group when groupingDebounceMs is undefined", async () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({ rootNode: counter })

    runInAction(() => {
      counter.value = 1
    })
    runInAction(() => {
      counter.value = 2
    })

    expect(manager.undoLevels).toBe(2)

    manager.dispose()
  })
})
