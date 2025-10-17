import { _Primitive } from "mobx-bonsai"
import type * as Y from "yjs"

export type YjsStructure = Y.Map<any> | Y.Array<any>
export type YjsValue = _Primitive | YjsStructure
