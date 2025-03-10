import { isObservable } from "mobx"
import { TNode, applySnapshot, getSnapshot, isNode, node, nodeType } from "../../src"
import { inDevMode } from "../../src/utils/inDevMode"

it("frozen nodes", () => {
  type Frozen = TNode<
    "frozen",
    {
      name: string
      hobbies: string[]
    }
  >
  const TFrozenPerson = nodeType<Frozen>("frozen").frozen()
  const frozenPerson = TFrozenPerson({ name: "John", hobbies: ["reading", "swimming"] })

  const checkIsValidFrozen = (node: Frozen) => {
    if (inDevMode) {
      expect(() => {
        frozenPerson.hobbies.push("dancing")
      }).toThrow()
      expect(() => {
        frozenPerson.name = "Doe"
      }).toThrow()
    }

    expect(isNode(node)).toBe(true)
    expect(isNode(node.hobbies)).toBe(false)
    expect(isObservable(node)).toBe(false)
    expect(isObservable(node.hobbies)).toBe(false)
  }

  checkIsValidFrozen(frozenPerson)

  // check that the node contents are not turned into nodes when put inside a node
  const parentNode = node({
    person: frozenPerson,
  })

  expect(parentNode.person).toBe(frozenPerson)
  checkIsValidFrozen(parentNode.person)

  // getSnapshot should return the same frozen object
  const snapshot = getSnapshot(frozenPerson)
  expect(snapshot).toBe(frozenPerson)

  expect(() => {
    applySnapshot(frozenPerson, frozenPerson) // noop but allowed
  }).not.toThrow()
  expect(frozenPerson.name).toBe("John")
  expect(frozenPerson.hobbies).toEqual(["reading", "swimming"])

  // applySnapshot over frozen nodes should fail
  const newSnapshot = { name: "Doe", hobbies: ["painting"] }
  expect(() => {
    applySnapshot(frozenPerson, newSnapshot)
  }).toThrow("applySnapshot does not work on frozen nodes")
  expect(frozenPerson.name).toBe("John")
  expect(frozenPerson.hobbies).toEqual(["reading", "swimming"])

  // applySnapshot over the parent node should generate the same frozen node if the same ref is used
  const newParentSnapshot = { person: frozenPerson }
  applySnapshot(parentNode, newParentSnapshot)
  expect(parentNode.person).toBe(frozenPerson)
  checkIsValidFrozen(parentNode.person)

  // applySnapshot over the parent node should generate a new frozen node if a different ref is used
  const newParentSnapshot2 = {
    person: TFrozenPerson.snapshot({ name: "Doe", hobbies: ["painting"] }),
  }
  applySnapshot(parentNode, newParentSnapshot2)
  expect(parentNode.person).not.toBe(frozenPerson)
  checkIsValidFrozen(parentNode.person)
})
