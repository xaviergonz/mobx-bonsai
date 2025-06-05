import { YjsStructure } from "./types"
import { failure } from "../../error/failure"
import { requireYjs } from "../requireYjs"

export function isYjsStructure(target: unknown): target is YjsStructure {
  const Y = requireYjs()
  return target instanceof Y.Map || target instanceof Y.Array
}

export function assertIsYjsStructure(target: unknown): asserts target is YjsStructure {
  const valid = isYjsStructure(target)
  if (!valid) {
    throw failure("target is not a bindable y.js object")
  }
}
