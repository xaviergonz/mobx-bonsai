import * as Y from "yjs"
import { YjsValue, applyPlainArrayToYArray, applyPlainObjectToYMap, bindYjsToNode } from "../../src"
import { Dispose } from "../../src/utils/disposable"

const disposers: Dispose[] = []

export function createObjectTestbed<T extends Record<string, any>>(initialData: T) {
  const yjsDoc = new Y.Doc()
  const yjsObject = yjsDoc.getMap("data") as Y.Map<YjsValue>
  applyPlainObjectToYMap(yjsObject, initialData)

  const {
    node: mobxObservable,
    dispose,
    getYjsValueForNode,
  } = bindYjsToNode<T>({
    yjsDoc: yjsDoc,
    yjsObject: yjsObject,
  })

  disposers.push(dispose)

  return { mobxObservable, yjsDoc, yjsObject, getYjsValueForNode }
}

export function createArrayTestbed<T extends any[]>(initialData: T) {
  const yjsDoc = new Y.Doc()
  const yjsObject = yjsDoc.getArray("data") as Y.Array<YjsValue>
  applyPlainArrayToYArray(yjsObject, initialData)

  const {
    node: mobxObservable,
    dispose,
    getYjsValueForNode,
  } = bindYjsToNode<T>({
    yjsDoc: yjsDoc,
    yjsObject: yjsObject,
  })

  disposers.push(dispose)

  return { mobxObservable, yjsDoc, yjsObject, getYjsValueForNode }
}

afterEach(() => {
  disposers.forEach((dispose) => dispose())
  disposers.length = 0
})
