import { runInAction } from "mobx"
import { nodeType } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"

describe("UndoManager - Multiple Managers", () => {
  type Counter = {
    value: number
  }

  const TCounter = nodeType<Counter>().defaults({
    value: () => 0,
  })

  type Document = {
    title: string
    counter: Counter
  }

  const TDocument = nodeType<Document>().defaults({
    title: () => "",
    counter: () => TCounter({ value: 0 }),
  })

  type RootStore = {
    doc1: Document
    doc2: Document
  }

  const TRootStore = nodeType<RootStore>().defaults({
    doc1: () => TDocument({ title: "Doc 1", counter: TCounter({ value: 0 }) }),
    doc2: () => TDocument({ title: "Doc 2", counter: TCounter({ value: 100 }) }),
  })

  test("should allow multiple managers on different branches of same root", () => {
    const rootStore = TRootStore({
      doc1: TDocument({ title: "Doc 1", counter: TCounter({ value: 0 }) }),
      doc2: TDocument({ title: "Doc 2", counter: TCounter({ value: 100 }) }),
    })

    // Create two separate managers, each tracking a different branch (document)
    const manager1 = new UndoManager({ rootNode: rootStore.doc1 })
    const manager2 = new UndoManager({ rootNode: rootStore.doc2 })

    // Each manager has its own store
    expect(manager1.store).not.toBe(manager2.store)

    // Make changes to doc1
    runInAction(() => {
      rootStore.doc1.title = "Updated Doc 1"
      rootStore.doc1.counter.value = 10
    })

    expect(manager1.undoLevels).toBe(1) // Tracked changes to doc1
    expect(manager2.undoLevels).toBe(0) // Not tracking doc1

    // Make changes to doc2
    runInAction(() => {
      rootStore.doc2.title = "Updated Doc 2"
      rootStore.doc2.counter.value = 200
    })

    expect(manager1.undoLevels).toBe(1) // Still 1
    expect(manager2.undoLevels).toBe(1) // Now has 1

    // Undo doc1 changes
    manager1.undo()
    expect(rootStore.doc1.title).toBe("Doc 1")
    expect(rootStore.doc1.counter.value).toBe(0)
    expect(rootStore.doc2.title).toBe("Updated Doc 2") // Unaffected
    expect(rootStore.doc2.counter.value).toBe(200)

    // Undo doc2 changes
    manager2.undo()
    expect(rootStore.doc1.title).toBe("Doc 1") // Still reverted
    expect(rootStore.doc2.title).toBe("Doc 2") // Restored
    expect(rootStore.doc2.counter.value).toBe(100)

    // Redo both
    manager1.redo()
    manager2.redo()
    expect(rootStore.doc1.title).toBe("Updated Doc 1")
    expect(rootStore.doc1.counter.value).toBe(10)
    expect(rootStore.doc2.title).toBe("Updated Doc 2")
    expect(rootStore.doc2.counter.value).toBe(200)

    // Make changes to both in same action
    runInAction(() => {
      rootStore.doc1.counter.value = 20
      rootStore.doc2.counter.value = 300
    })

    expect(manager1.undoLevels).toBe(2) // Tracked doc1 change
    expect(manager2.undoLevels).toBe(2) // Tracked doc2 change

    // Undo only doc1
    manager1.undo()
    expect(rootStore.doc1.counter.value).toBe(10) // Undone
    expect(rootStore.doc2.counter.value).toBe(300) // Not affected by manager1

    // Undo only doc2
    manager2.undo()
    expect(rootStore.doc1.counter.value).toBe(10) // Still 10
    expect(rootStore.doc2.counter.value).toBe(200) // Undone

    manager1.dispose()
    manager2.dispose()
  })
})
