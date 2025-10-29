import { runInAction } from "mobx"
import { nodeType, TNode } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"

describe("UndoManager - Keyed Nodes", () => {
  test("undo/redo should work with keyed nodes (withKey)", () => {
    type User = TNode<
      "User",
      {
        id: string
        name: string
        email: string
      }
    >

    const TUser = nodeType<User>("User").withKey("id")

    type Model = {
      currentUser: User | null
      users: User[]
    }

    const TModel = nodeType<Model>().defaults({
      currentUser: () => null,
      users: () => [],
    })

    const model = TModel({
      currentUser: null,
      users: [],
    })
    const manager = new UndoManager({ rootNode: model })

    // Create a user with a specific ID
    const user1 = TUser({ id: "u1", name: "Alice", email: "alice@example.com" })
    runInAction(() => {
      model.currentUser = user1
    })

    expect(model.currentUser).toBe(user1)
    expect(manager.undoLevels).toBe(1)

    // Update the user - since it has the same ID, it should reconcile to the same instance
    const user1Updated = TUser({ id: "u1", name: "Alice Smith", email: "alice.smith@example.com" })
    runInAction(() => {
      model.currentUser = user1Updated
    })

    // Key insight: user1 and user1Updated should be the SAME instance due to withKey
    expect(user1Updated).toBe(user1)
    expect(model.currentUser).toBe(user1)
    expect(model.currentUser?.name).toBe("Alice Smith")
    expect(model.currentUser?.email).toBe("alice.smith@example.com")
    // The undo manager should record the property changes within the same action
    // Since both name and email are updated in one runInAction, they're in one undo event
    expect(manager.undoLevels).toBe(2)

    // Undo the update
    manager.undo()
    expect(model.currentUser).toBe(user1) // Still the same instance
    expect(model.currentUser?.name).toBe("Alice")
    expect(model.currentUser?.email).toBe("alice@example.com")

    // Redo the update
    manager.redo()
    expect(model.currentUser).toBe(user1) // Still the same instance
    expect(model.currentUser?.name).toBe("Alice Smith")
    expect(model.currentUser?.email).toBe("alice.smith@example.com")

    // Test with array of keyed nodes
    const user2 = TUser({ id: "u2", name: "Bob", email: "bob@example.com" })
    const user3 = TUser({ id: "u3", name: "Charlie", email: "charlie@example.com" })

    runInAction(() => {
      model.users.push(user2, user3)
    })

    expect(model.users.length).toBe(2)
    expect(model.users[0]).toBe(user2)
    expect(model.users[1]).toBe(user3)
    expect(manager.undoLevels).toBe(3)

    // Update a user in the array by assigning with same key
    const user2Updated = TUser({ id: "u2", name: "Bob Jones", email: "bob.jones@example.com" })
    runInAction(() => {
      model.users[0] = user2Updated
    })

    // Should be the same instance due to reconciliation
    expect(user2Updated).toBe(user2)
    expect(model.users[0]).toBe(user2)
    expect(model.users[0].name).toBe("Bob Jones")
    expect(manager.undoLevels).toBe(4)

    // Undo the user update
    manager.undo()
    expect(model.users[0]).toBe(user2) // Same instance
    expect(model.users[0].name).toBe("Bob")

    // Test removing and re-adding a user (splice operation)
    runInAction(() => {
      model.users.splice(0, 1) // Remove user2
    })

    expect(model.users.length).toBe(1)
    expect(model.users[0]).toBe(user3)
    expect(manager.undoLevels).toBe(4) // Was 3 after undo, now 4 after splice (new action added)

    // Undo the removal
    manager.undo()
    expect(model.users.length).toBe(2)
    expect(model.users[0]).toBe(user2)
    expect(model.users[1]).toBe(user3)

    // Redo the removal
    manager.redo()
    expect(model.users.length).toBe(1)
    expect(model.users[0]).toBe(user3)

    // Re-add user2 at the end
    runInAction(() => {
      model.users.push(user2)
    })

    expect(model.users.length).toBe(2)
    expect(model.users[0]).toBe(user3)
    expect(model.users[1]).toBe(user2)
    expect(manager.undoLevels).toBe(5)

    // Clear all - undo everything
    while (manager.canUndo) {
      manager.undo()
    }

    expect(model.currentUser).toBeNull()
    expect(model.users.length).toBe(0)

    // Redo everything
    while (manager.canRedo) {
      manager.redo()
    }

    expect(model.currentUser).toBe(user1)
    expect(model.users.length).toBe(2)
    expect(model.users[0]).toBe(user3)
    expect(model.users[1]).toBe(user2)

    manager.dispose()
  })
})
