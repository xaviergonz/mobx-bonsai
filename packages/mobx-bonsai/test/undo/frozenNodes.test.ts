import { runInAction } from "mobx"
import { nodeType, TNode } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"

describe("UndoManager - Frozen Nodes", () => {
  test("undo/redo should work with frozen nodes", () => {
    type Person = TNode<
      "Person",
      {
        name: string
        age: number
      }
    >

    const TPerson = nodeType<Person>("Person").frozen()

    type Model = {
      person: Person | null
      people: Person[]
    }

    const TModel = nodeType<Model>().defaults({
      person: () => null,
      people: () => [],
    })

    const model = TModel({
      person: null,
      people: [],
    })
    const manager = new UndoManager({ rootNode: model })

    // Test setting a frozen node property
    runInAction(() => {
      model.person = TPerson({ name: "Alice", age: 30 })
    })

    expect(model.person).toMatchObject({ name: "Alice", age: 30 })
    expect(manager.undoLevels).toBe(1)

    // Test updating a frozen node property (replaces entire object)
    runInAction(() => {
      model.person = TPerson({ name: "Bob", age: 25 })
    })

    expect(model.person).toMatchObject({ name: "Bob", age: 25 })
    expect(manager.undoLevels).toBe(2)

    // Test undo
    manager.undo()
    expect(model.person).toMatchObject({ name: "Alice", age: 30 })

    manager.undo()
    expect(model.person).toBeNull()

    // Test redo
    manager.redo()
    expect(model.person).toMatchObject({ name: "Alice", age: 30 })

    manager.redo()
    expect(model.person).toMatchObject({ name: "Bob", age: 25 })

    // Test frozen nodes in arrays
    runInAction(() => {
      model.people.push(TPerson({ name: "Charlie", age: 35 }))
      model.people.push(TPerson({ name: "Diana", age: 28 }))
    })

    expect(model.people.length).toBe(2)
    expect(model.people[0]).toMatchObject({ name: "Charlie", age: 35 })
    expect(model.people[1]).toMatchObject({ name: "Diana", age: 28 })
    expect(manager.undoLevels).toBe(3) // One action for both pushes

    // Update array element (replaces frozen object)
    runInAction(() => {
      model.people[0] = TPerson({ name: "Charlie Updated", age: 36 })
    })

    expect(model.people[0]).toMatchObject({ name: "Charlie Updated", age: 36 })
    expect(manager.undoLevels).toBe(4)

    // Undo array element update
    manager.undo()
    expect(model.people[0]).toMatchObject({ name: "Charlie", age: 35 })

    // Undo array additions
    manager.undo()
    expect(model.people.length).toBe(0)

    // Redo
    manager.redo()
    expect(model.people.length).toBe(2)
    expect(model.people[0]).toMatchObject({ name: "Charlie", age: 35 })

    manager.redo()
    expect(model.people[0]).toMatchObject({ name: "Charlie Updated", age: 36 })

    manager.dispose()
  })
})
