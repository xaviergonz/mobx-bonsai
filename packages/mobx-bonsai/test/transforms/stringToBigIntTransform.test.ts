import { assert, _ } from "spec.ts"
import { nodeType, stringToBigIntTransform } from "../../src"
import { runInAction } from "mobx"

test("stringToBigIntTransform returns BigInt for valid string", () => {
  type N = { str: string }
  const TN = nodeType<N>().getters({
    getBigInt: stringToBigIntTransform("str"),
  })

  assert(TN.getBigInt, _ as (n: N) => bigint)

  const str = "123456789012345678901234567890" // A large number as string
  const n = TN({ str })
  const bigint = TN.getBigInt(n)
  expect(typeof bigint).toBe("bigint")
  expect(bigint.toString()).toBe(str)
})

test("stringToBigIntTransform returns undefined and null correctly", () => {
  type N = { str?: string | null }
  const TN = nodeType<N>().getters({
    getBigInt: stringToBigIntTransform("str"),
  })

  assert(TN.getBigInt, _ as (n: N) => bigint | undefined | null)

  const str = "123456789012345678901234567890"
  const n = TN({ str })
  expect(TN.getBigInt(n)!.toString()).toBe(str)

  // undefined case
  runInAction(() => {
    n.str = undefined
  })
  expect(TN.getBigInt(n)).toBeUndefined()

  // null case
  runInAction(() => {
    n.str = null
  })
  expect(TN.getBigInt(n)).toBeNull()
})
