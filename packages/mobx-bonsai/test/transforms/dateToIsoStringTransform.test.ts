import { assert, _ } from "spec.ts"
import { nodeType, dateToIsoStringTransform, ImmutableDate } from "../../src"

test("dateToIsoStringTransform converts Date/ImmutableDate to ISO string", () => {
  type N = { isoString: string }
  const TN = nodeType<N>().actions({
    setDate: dateToIsoStringTransform("isoString"),
  })

  assert(TN.setDate, _ as (n: N, date: Date | ImmutableDate) => void)

  const initialIsoString = "2021-01-01T00:00:00.000Z"
  const n = TN({ isoString: initialIsoString })

  const date = new Date("2021-01-02T00:00:00.000Z")
  TN.setDate(n, date)
  expect(n.isoString).toBe("2021-01-02T00:00:00.000Z")

  const immutableDate = new ImmutableDate("2021-01-03T00:00:00.000Z")
  TN.setDate(n, immutableDate)
  expect(n.isoString).toBe("2021-01-03T00:00:00.000Z")
})

test("dateToIsoStringTransform handles null and undefined correctly", () => {
  type N = { isoString?: string | null }
  const TN = nodeType<N>().actions({
    setDate: dateToIsoStringTransform("isoString"),
  })

  assert(TN.setDate, _ as (n: N, date: Date | ImmutableDate | null | undefined) => void)

  const n = TN({ isoString: "2021-10-01T00:00:00.000Z" })

  // null case
  TN.setDate(n, null)
  expect(n.isoString).toBeNull()

  // undefined case
  TN.setDate(n, undefined)
  expect(n.isoString).toBeUndefined()
})
