import type * as Y from "yjs"
import { Primitive } from "../../plainTypes/types"

export type YjsStructure = Y.Map<any> | Y.Array<any>
export type YjsValue = Primitive | YjsStructure
