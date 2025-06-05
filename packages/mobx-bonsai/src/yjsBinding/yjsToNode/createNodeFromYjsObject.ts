import { failure } from "../../error/failure"
import { node } from "../../node/node"
import { YjsStructure } from "../yjsTypes/types"
import { requireYjs } from "../requireYjs"

export function createNodeFromYjsObject<T extends object>(yjsObject: YjsStructure): T {
  const Y = requireYjs()

  if (yjsObject instanceof Y.Map || yjsObject instanceof Y.Array) {
    return node(yjsObject.toJSON(), { skipInit: true }) as unknown as T
  } else {
    throw failure("only Y.js Map and Array instances can be bound to nodes")
  }
}
