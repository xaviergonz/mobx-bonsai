import { node } from "mobx-bonsai"
import * as Y from "yjs"
import { failure } from "../../error/failure"
import { YjsStructure } from "../yjsTypes/types"

export function createNodeFromYjsObject<T extends object>(yjsObject: YjsStructure): T {
  if (yjsObject instanceof Y.Map || yjsObject instanceof Y.Array) {
    return node(yjsObject.toJSON(), { skipInit: true }) as unknown as T
  } else {
    throw failure("only Y.js Map and Array instances can be bound to nodes")
  }
}
