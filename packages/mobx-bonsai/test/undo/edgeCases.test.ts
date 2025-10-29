import { reaction, runInAction } from "mobx"
import { nodeType } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"
import { createUndoStore } from "../../src"

describe("UndoManager - Edge Cases", () => {
  type Counter = {
    value: number
  }

  const TCounter = nodeType<Counter>().defaults({
    value: () => 0,
  })

  test("should throw when undoing inside a MobX action", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({ rootNode: counter })

    runInAction(() => {
      counter.value = 1
    })

    expect(manager.canUndo).toBe(true)

    expect(() => {
      runInAction(() => {
        manager.undo()
      })
    }).toThrow(/cannot call undo.*inside.*action/i)

    manager.dispose()
  })

  test("should throw when redoing inside a MobX action", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({ rootNode: counter })

    runInAction(() => {
      counter.value = 1
    })

    manager.undo()

    expect(manager.canRedo).toBe(true)

    expect(() => {
      runInAction(() => {
        manager.redo()
      })
    }).toThrow(/cannot call redo.*inside.*action/i)

    manager.dispose()
  })

  test("reactions should be part of the same undo step as the action that triggered them", () => {
    type Person = {
      firstName: string
      lastName: string
      fullName: string
    }

    const TPerson = nodeType<Person>().defaults({
      firstName: () => "",
      lastName: () => "",
      fullName: () => "",
    })

    const person = TPerson({
      firstName: "John",
      lastName: "Doe",
      fullName: "John Doe",
    })

    const manager = new UndoManager({ rootNode: person })

    // Create a reaction that updates fullName when firstName or lastName changes
    const disposer = reaction(
      () => `${person.firstName} ${person.lastName}`,
      (fullName) => {
        person.fullName = fullName
      }
    )

    // Make a change that will trigger the reaction
    runInAction(() => {
      person.firstName = "Jane"
    })

    // Both the firstName change and the reaction's fullName change should be in one undo event
    expect(manager.undoLevels).toBe(1)
    expect(person.firstName).toBe("Jane")
    expect(person.fullName).toBe("Jane Doe")

    // Check that the event contains both changes
    const undoEvent = manager.undoQueue[0]
    expect(undoEvent.changes.length).toBe(2)

    // Find the changes
    const firstNameChange = undoEvent.changes.find(
      (c) => c.operation === "object-update" && c.propertyName === "firstName"
    )
    const fullNameChange = undoEvent.changes.find(
      (c) => c.operation === "object-update" && c.propertyName === "fullName"
    )

    expect(firstNameChange).toBeDefined()
    expect(fullNameChange).toBeDefined()

    // Undo should revert both changes
    manager.undo()
    expect(person.firstName).toBe("John")
    expect(person.fullName).toBe("John Doe")

    // Redo should restore both changes
    manager.redo()
    expect(person.firstName).toBe("Jane")
    expect(person.fullName).toBe("Jane Doe")

    disposer()
    manager.dispose()
  })

  test("should not track changes to the UndoStore itself", () => {
    type RootWithStore = {
      counter: Counter
      myStore: any // Will hold the UndoStore
    }

    const TRootWithStore = nodeType<RootWithStore>().defaults({
      counter: () => TCounter({ value: 0 }),
      myStore: () => null as any,
    })

    const root = TRootWithStore({
      counter: TCounter({ value: 0 }),
      myStore: createUndoStore(),
    })

    // Create the manager with the root
    const manager = new UndoManager({ rootNode: root, store: root.myStore })

    // Now make a change to the counter
    runInAction(() => {
      root.counter.value = 5
    })

    // We should have 1 undo levels now (counter change)
    expect(manager.undoLevels).toBe(1)

    // Undo the counter change
    manager.undo()
    expect(root.counter.value).toBe(0)
    expect(manager.undoLevels).toBe(0)

    // The important part: when we undo/redo, the store's internal arrays
    // (undoEvents, redoEvents) are modified, but those changes should NOT
    // create new undo events, even though the store is part of the tree

    // Make another change
    runInAction(() => {
      root.counter.value = 10
    })

    // Should be 2 levels: myStore assignment + new counter change
    // (the previous counter change was undone and moved to redo queue)
    expect(manager.undoLevels).toBe(1)

    // The undo/redo operations modified the store's arrays multiple times,
    // but none of those modifications created undo events
    // If they had, we'd have many more undo levels

    manager.dispose()
  })

  test("should handle multiple changes to the same property in one action", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({ rootNode: counter })

    runInAction(() => {
      counter.value = 1
      counter.value = 2
      counter.value = 3
    })

    // All changes should be in one undo event
    expect(manager.undoLevels).toBe(1)
    expect(counter.value).toBe(3)

    // Undo should restore to the original value
    manager.undo()
    expect(counter.value).toBe(0)

    // Redo should go to the final value
    manager.redo()
    expect(counter.value).toBe(3)

    manager.dispose()
  })

  test("should handle array sorting without crashing", () => {
    type Item = {
      id: number
      name: string
    }

    type ItemList = {
      items: Item[]
    }

    const TItem = nodeType<Item>().defaults({
      id: () => 0,
      name: () => "",
    })

    const TItemList = nodeType<ItemList>().defaults({
      items: () => [],
    })

    const list = TItemList({
      items: [
        TItem({ id: 3, name: "C" }),
        TItem({ id: 1, name: "A" }),
        TItem({ id: 2, name: "B" }),
      ],
    })

    const manager = new UndoManager({ rootNode: list })

    const originalOrder = list.items.map((item) => item.id)

    // Sort the array
    runInAction(() => {
      list.items.sort((a, b) => a.id - b.id)
    })

    expect(list.items.map((item) => item.id)).toEqual([1, 2, 3])
    expect(manager.undoLevels).toBe(1)

    // Undo should restore original order
    manager.undo()
    expect(list.items.map((item) => item.id)).toEqual(originalOrder)

    // Redo should restore sorted order
    manager.redo()
    expect(list.items.map((item) => item.id)).toEqual([1, 2, 3])

    manager.dispose()
  })

  test("should handle node removal and re-addition", () => {
    type Item = {
      id: number
      value: string
    }

    type ItemList = {
      items: Item[]
    }

    const TItem = nodeType<Item>().defaults({
      id: () => 0,
      value: () => "",
    })

    const TItemList = nodeType<ItemList>().defaults({
      items: () => [],
    })

    const list = TItemList({
      items: [
        TItem({ id: 1, value: "A" }),
        TItem({ id: 2, value: "B" }),
        TItem({ id: 3, value: "C" }),
      ],
    })

    const manager = new UndoManager({ rootNode: list })

    // Remove an item
    runInAction(() => {
      list.items.splice(1, 1)
    })

    expect(list.items.length).toBe(2)
    expect(list.items[0].id).toBe(1)
    expect(list.items[1].id).toBe(3)
    expect(manager.undoLevels).toBe(1)

    // Undo removal
    manager.undo()
    expect(list.items.length).toBe(3)
    expect(list.items[1].id).toBe(2)
    expect(list.items[1].value).toBe("B")

    // Redo removal
    manager.redo()
    expect(list.items.length).toBe(2)

    // Re-add the item
    runInAction(() => {
      list.items.push(TItem({ id: 2, value: "B" }))
    })

    expect(list.items.length).toBe(3)
    expect(manager.undoLevels).toBe(2)

    // Undo re-addition
    manager.undo()
    expect(list.items.length).toBe(2)

    manager.dispose()
  })

  test("should handle nested property changes", () => {
    type Address = {
      street: string
      city: string
    }

    type Person = {
      name: string
      address: Address
    }

    const TAddress = nodeType<Address>().defaults({
      street: () => "",
      city: () => "",
    })

    const TPerson = nodeType<Person>().defaults({
      name: () => "",
      address: () => TAddress({ street: "", city: "" }),
    })

    const person = TPerson({
      name: "John",
      address: TAddress({ street: "Main St", city: "NYC" }),
    })

    const manager = new UndoManager({ rootNode: person })

    // Change nested property
    runInAction(() => {
      person.address.city = "LA"
    })

    expect(manager.undoLevels).toBe(1)
    expect(person.address.city).toBe("LA")

    // Undo
    manager.undo()
    expect(person.address.city).toBe("NYC")

    // Change multiple nested properties in one action
    runInAction(() => {
      person.address.street = "Broadway"
      person.address.city = "SF"
    })

    expect(manager.undoLevels).toBe(1)

    // Undo should revert both
    manager.undo()
    expect(person.address.street).toBe("Main St")
    expect(person.address.city).toBe("NYC")

    manager.dispose()
  })
})
