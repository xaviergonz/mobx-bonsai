import * as Y from "yjs"
import { YjsValue } from "../../../src"
import { convertPlainToYjsValue } from "../../../src/yjsBinding/nodeToYjs/convertPlainToYjsValue"

describe("convertPlainToYjsValue", () => {
  // Y.js structures need to be wrapped in a Y.Doc before they can be read
  const fixYjsStructure = (yjsValue: YjsValue) => {
    const doc = new Y.Doc()
    doc.getMap("root").set("result", yjsValue)
  }

  test("should return primitive values unchanged", () => {
    expect(convertPlainToYjsValue("hello")).toBe("hello")
    expect(convertPlainToYjsValue(42)).toBe(42)
    expect(convertPlainToYjsValue(true)).toBe(true)
    expect(convertPlainToYjsValue(null)).toBe(null)
    expect(convertPlainToYjsValue(undefined)).toBe(undefined)
  })

  test("should convert a plain array to a Y.Array", () => {
    const plainArray = [1, "two", false]
    const result = convertPlainToYjsValue(plainArray)
    fixYjsStructure(result)

    expect(result).toBeInstanceOf(Y.Array)
    expect((result as Y.Array<unknown>).toJSON()).toStrictEqual(plainArray)
  })

  test("should convert a plain object to a Y.Map", () => {
    const plainObject = { a: 1, b: "two", c: [true, false] }
    const result = convertPlainToYjsValue(plainObject)
    fixYjsStructure(result)

    expect(result).toBeInstanceOf(Y.Map)
    const mapResult = result as Y.Map<unknown>
    expect(mapResult.get("a")).toBe(1)
    expect(mapResult.get("b")).toBe("two")
    const arrayValue = mapResult.get("c")
    expect(arrayValue).toBeInstanceOf(Y.Array)
    expect((arrayValue as Y.Array<unknown>).toArray()).toStrictEqual([true, false])
  })

  test("should handle nested structures", () => {
    const nested = {
      arr: [{ x: 10 }, { y: "test" }],
      obj: { nestedArr: [1, 2, 3] },
    }
    const result = convertPlainToYjsValue(nested)
    fixYjsStructure(result)

    expect(result).toBeInstanceOf(Y.Map)
    const mapResult = result as Y.Map<unknown>

    const arrValue = mapResult.get("arr")
    expect(arrValue).toBeInstanceOf(Y.Array)
    const arrItems = (arrValue as Y.Array<unknown>).toArray()
    expect(arrItems[0]).toBeInstanceOf(Y.Map)
    expect((arrItems[0] as Y.Map<unknown>).get("x")).toBe(10)
    expect(arrItems[1]).toBeInstanceOf(Y.Map)
    expect((arrItems[1] as Y.Map<unknown>).get("y")).toBe("test")

    const objValue = mapResult.get("obj")
    expect(objValue).toBeInstanceOf(Y.Map)
    const nestedArr = (objValue as Y.Map<unknown>).get("nestedArr")
    expect(nestedArr).toBeInstanceOf(Y.Array)
    expect((nestedArr as Y.Array<unknown>).toArray()).toStrictEqual([1, 2, 3])
  })
})
