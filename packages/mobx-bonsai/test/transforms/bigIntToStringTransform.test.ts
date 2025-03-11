import { assert, _ } from "spec.ts"
import { nodeType, bigIntToStringTransform } from "../../src"

test("bigIntToStringTransform converts BigInt to string", () => {
  type N = { str: string }
  const TN = nodeType<N>().actions({
    setBigInt: bigIntToStringTransform("str"),
  })

  assert(TN.setBigInt, _ as (n: N, bigint: bigint) => void)

  const initialStr = "0"
  const n = TN({ str: initialStr })

  const bigInt1 = BigInt("123456789012345678901234567890")
  TN.setBigInt(n, bigInt1)
  expect(n.str).toBe("123456789012345678901234567890")

  const bigInt2 = BigInt("987654321098765432109876543210")
  TN.setBigInt(n, bigInt2)
  expect(n.str).toBe("987654321098765432109876543210")
})

test("bigIntToStringTransform handles null and undefined correctly", () => {
  type N = { str?: string | null }
  const TN = nodeType<N>().actions({
    setBigInt: bigIntToStringTransform("str"),
  })

  assert(TN.setBigInt, _ as (n: N, bigint: bigint | null | undefined) => void)

  const n = TN({ str: "123456789012345678901234567890" })

  // null case
  TN.setBigInt(n, null)
  expect(n.str).toBeNull()

  // undefined case
  TN.setBigInt(n, undefined)
  expect(n.str).toBeUndefined()
})
