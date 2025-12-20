import * as Y from "yjs"
import { failure } from "../../error/failure"
import { assertIsYjsStructure } from "../yjsTypes/checks"
import { YjsStructure } from "../yjsTypes/types"

export function resolveYjsStructurePath(
  yjsObject: YjsStructure,
  path: readonly (string | number)[]
): YjsStructure {
  let target = yjsObject
  assertIsYjsStructure(target)

  path.forEach((pathSegment, i) => {
    if (target instanceof Y.Array) {
      target = target.get(+pathSegment)
    } else if (target instanceof Y.Map) {
      target = target.get(String(pathSegment))
    } else {
      throw failure(
        `Y.Map or Y.Array was expected at path ${JSON.stringify(
          path.slice(0, i)
        )} in order to resolve path ${JSON.stringify(path)}, but got ${target} instead`
      )
    }
  })

  return target
}
