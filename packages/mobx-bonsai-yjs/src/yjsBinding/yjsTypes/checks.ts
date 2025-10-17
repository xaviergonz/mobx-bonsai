import * as Y from "yjs"
import { failure } from "../../error/failure"
import { YjsStructure } from "./types"

export function isYjsStructure(target: unknown): target is YjsStructure {
  return target instanceof Y.Map || target instanceof Y.Array
}

export function assertIsYjsStructure(target: unknown): asserts target is YjsStructure {
  const valid = isYjsStructure(target)
  if (!valid) {
    throw failure("target is not a bindable y.js object")
  }
}
