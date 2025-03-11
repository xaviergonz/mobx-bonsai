import { assert, _ } from "spec.ts"
import { nodeType, dateToTimestampTransform, ImmutableDate } from "../../src"

test("dateToTimestampTransform converts Date/ImmutableDate to timestamp", () => {
  type N = { timestamp: number }
  const TN = nodeType<N>().actions({
    setDate: dateToTimestampTransform("timestamp"),
  })

  assert(TN.setDate, _ as (n: N, date: Date | ImmutableDate) => void)

  const t = 0
  const n = TN({ timestamp: t })

  const date = new Date(t + 1)
  TN.setDate(n, date)
  expect(n.timestamp).toBe(t + 1)

  const immutableDate = new ImmutableDate(t + 2)
  TN.setDate(n, immutableDate)
  expect(n.timestamp).toBe(t + 2)
})

test("dateToTimestampTransform handles null and undefined correctly", () => {
  type N = { timestamp?: number | null }
  const TN = nodeType<N>().actions({
    setDate: dateToTimestampTransform("timestamp"),
  })

  assert(TN.setDate, _ as (n: N, date: Date | ImmutableDate | null | undefined) => void)

  const n = TN({ timestamp: 1633072800000 })

  // null case
  TN.setDate(n, null)
  expect(n.timestamp).toBeNull()

  // undefined case
  TN.setDate(n, undefined)
  expect(n.timestamp).toBeUndefined()
})
