import { configure, remove, runInAction, set } from "mobx"
import { nodeType } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"
import { getSnapshot } from "../../src"

describe("UndoManager - Basic Operations", () => {
  // Define node types for testing
  type TodoItem = {
    text: string
    completed: boolean
  }

  type TodoList = {
    items: TodoItem[]
  }

  const TTodoItem = nodeType<TodoItem>().defaults({
    text: () => "",
    completed: () => false,
  })

  const TTodoList = nodeType<TodoList>().defaults({
    items: () => [],
  })

  let todoList: TodoList
  let undoManager: UndoManager

  beforeEach(() => {
    todoList = TTodoList({
      items: [
        TTodoItem({ text: "Item 1", completed: false }),
        TTodoItem({ text: "Item 2", completed: true }),
      ],
    })
    undoManager = new UndoManager({ rootNode: todoList })
  })

  afterEach(() => {
    undoManager.dispose()
  })

  test("should track simple property changes", () => {
    expect(undoManager.canUndo).toBe(false)
    expect(undoManager.undoLevels).toBe(0)

    runInAction(() => {
      todoList.items[0].text = "Modified Item"
    })

    expect(undoManager.canUndo).toBe(true)
    expect(undoManager.undoLevels).toBe(1)
    expect(todoList.items[0].text).toBe("Modified Item")

    undoManager.undo()

    expect(undoManager.canUndo).toBe(false)
    expect(todoList.items[0].text).toBe("Item 1")
  })

  test("should track redo operations", () => {
    runInAction(() => {
      todoList.items[0].text = "Modified"
    })

    expect(undoManager.canRedo).toBe(false)

    undoManager.undo()

    expect(undoManager.canRedo).toBe(true)
    expect(undoManager.redoLevels).toBe(1)

    undoManager.redo()

    expect(undoManager.canRedo).toBe(false)
    expect(todoList.items[0].text).toBe("Modified")
  })

  test("should group changes within a single action", () => {
    runInAction(() => {
      todoList.items[0].text = "New Text"
      todoList.items[0].completed = true
      todoList.items[1].text = "Another Change"
    })

    expect(undoManager.undoLevels).toBe(1)

    undoManager.undo()

    expect(todoList.items[0].text).toBe("Item 1")
    expect(todoList.items[0].completed).toBe(false)
    expect(todoList.items[1].text).toBe("Item 2")
  })

  test("should track array operations", () => {
    const newItem = TTodoItem({ text: "New Item", completed: false })

    runInAction(() => {
      todoList.items.push(newItem)
    })

    expect(todoList.items.length).toBe(3)
    expect(undoManager.undoLevels).toBe(1)

    undoManager.undo()

    expect(todoList.items.length).toBe(2)
  })

  test("should track array splice operations", () => {
    runInAction(() => {
      todoList.items.splice(0, 1)
    })

    expect(todoList.items.length).toBe(1)
    expect(todoList.items[0].text).toBe("Item 2")

    undoManager.undo()

    expect(todoList.items.length).toBe(2)
    expect(todoList.items[0].text).toBe("Item 1")
  })

  test("should handle array length changes (making it shorter)", () => {
    // Start with X items
    const snapshot = getSnapshot(todoList)
    expect(snapshot.items.length).toBe(2)

    // Reduce array length to 0
    runInAction(() => {
      todoList.items.length = 0
    })

    expect(todoList.items.length).toBe(0)

    // Undo should restore the removed items
    undoManager.undo()

    expect(todoList.items.length).toBe(2)

    // Redo should remove it again
    undoManager.redo()

    expect(todoList.items.length).toBe(0)
  })

  test("should clear redo queue when new change is made", () => {
    runInAction(() => {
      todoList.items[0].text = "Change 1"
    })

    undoManager.undo()
    expect(undoManager.canRedo).toBe(true)

    runInAction(() => {
      todoList.items[0].text = "Change 2"
    })

    expect(undoManager.canRedo).toBe(false)
  })

  test("should handle clearUndo", () => {
    runInAction(() => {
      todoList.items[0].text = "Change 1"
    })

    runInAction(() => {
      todoList.items[0].text = "Change 2"
    })

    expect(undoManager.undoLevels).toBe(2)

    undoManager.clearUndo()

    expect(undoManager.undoLevels).toBe(0)
    expect(undoManager.canUndo).toBe(false)
  })

  test("should handle clearRedo", () => {
    runInAction(() => {
      todoList.items[0].text = "Change"
    })

    undoManager.undo()
    expect(undoManager.canRedo).toBe(true)

    undoManager.clearRedo()

    expect(undoManager.canRedo).toBe(false)
    expect(undoManager.redoLevels).toBe(0)
  })

  test("should throw when undoing with nothing to undo", () => {
    expect(() => undoManager.undo()).toThrow("nothing to undo")
  })

  test("should throw when redoing with nothing to redo", () => {
    expect(() => undoManager.redo()).toThrow("nothing to redo")
  })

  test("should handle property addition", () => {
    type Extensible = Record<string, any>

    const TExtensible = nodeType<Extensible>().defaults({})

    const node = TExtensible({})
    const manager = new UndoManager({ rootNode: node })

    runInAction(() => {
      set(node, "newProp", "value") // use set() for MobX 4 compatibility
    })

    expect(node.newProp).toBe("value")

    manager.undo()

    expect(node.newProp).toBeUndefined()
    expect("newProp" in node).toBe(false)

    manager.dispose()
  })

  test("should handle property deletion", () => {
    type Extensible = Record<string, any>

    const TExtensible = nodeType<Extensible>().defaults({
      existingProp: () => "initial",
    })

    const node = TExtensible({})
    const manager = new UndoManager({ rootNode: node })

    expect(node.existingProp).toBe("initial")

    runInAction(() => {
      remove(node, "existingProp") // use remove() for MobX 4 compatibility
    })

    expect(node.existingProp).toBeUndefined()

    manager.undo()

    expect(node.existingProp).toBe("initial")

    manager.dispose()
  })

  test("should work with changes outside MobX actions", () => {
    // Temporarily allow changes outside of actions
    configure({ enforceActions: "never" })

    try {
      const manager = new UndoManager({ rootNode: todoList })

      expect(manager.canUndo).toBe(false)

      // Make a change outside of an action
      todoList.items[0].text = "Changed outside action"

      expect(manager.canUndo).toBe(true)
      expect(manager.undoLevels).toBe(1)

      manager.undo()

      expect(todoList.items[0].text).toBe("Item 1")
      expect(manager.canUndo).toBe(false)
      expect(manager.canRedo).toBe(true)

      manager.redo()

      expect(todoList.items[0].text).toBe("Changed outside action")

      manager.dispose()
    } finally {
      // Restore original configuration
      configure({ enforceActions: "always" })
    }
  })
})
