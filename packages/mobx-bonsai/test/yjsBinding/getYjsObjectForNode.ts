import * as Y from "yjs"
import { node } from "../../src"
import { createObjectTestbed } from "./testbed"

it("should resolve a nodes to Y.js structures", () => {
  const { mobxObservable, getYjsValueForNode, yjsObject } = createObjectTestbed({
    childMap: { sub: {} },
    childArray: [{}],
  })
  expect(getYjsValueForNode(mobxObservable)).toBe(yjsObject)

  expect(getYjsValueForNode(mobxObservable.childMap)).toBe(yjsObject.get("childMap"))
  expect(getYjsValueForNode(mobxObservable.childMap.sub)).toBe(
    (yjsObject.get("childMap") as Y.Map<any>).get("sub")
  )

  expect(getYjsValueForNode(mobxObservable.childArray)).toBe(yjsObject.get("childArray"))
  expect(getYjsValueForNode(mobxObservable.childArray[0])).toBe(
    (yjsObject.get("childArray") as Y.Array<any>).get(0)
  )
})

it("should throw when the target node is not in the bound tree", () => {
  const { getYjsValueForNode } = createObjectTestbed({
    childMap: {},
    childArray: [],
  })
  const unknownNode = node({})

  expect(() => getYjsValueForNode(unknownNode)).toThrow("node not found in the bound tree")
})
