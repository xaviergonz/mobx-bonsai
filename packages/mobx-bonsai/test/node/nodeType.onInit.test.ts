import { runInAction } from "mobx"
import {
  node,
  onDeepChange,
  nodeType,
  TNode,
  getNodeTypeId,
  NodeTypeValue,
  onInit,
} from "../../src"

test("chainable onInit and standaloneOnInit", () => {
  let chainableCalled = false
  let standaloneCalled = false

  type Test = TNode<"test", { val: number }>

  const TTest = nodeType<Test>("test").onInit((n) => {
    expect(n.val).toBe(6)
    chainableCalled = true
  })

  onInit(TTest, (n: Test) => {
    standaloneCalled = true
    expect(n.val).toBe(6)
  })

  TTest({ val: 6 })
  expect(chainableCalled).toBe(true)
  expect(standaloneCalled).toBe(true)
})

test("should call children onNodeInit callbacks before parent", () => {
  const callOrder: NodeTypeValue[] = []

  type ChildNode = TNode<"child", {}>

  type ParentNode = TNode<"parent", { children?: ChildNode[] }>

  using tParent = nodeType<ParentNode>("parent").onInit((node) => {
    callOrder.push(getNodeTypeId(node)!)
  })

  using tChild = nodeType<ChildNode>("child").onInit((node) => {
    callOrder.push(getNodeTypeId(node)!)
  })

  tParent({
    children: [tChild({})],
  })

  expect(callOrder).toStrictEqual(["child", "parent"])
})

test("should pick up property changes during initialization for deep observation", () => {
  const events: unknown[] = []

  type T1 = TNode<"1", { value: number }>
  using t1 = nodeType<T1>("1").onInit((node) => {
    events.push("init")
    node.value++
  })

  const root = node<{
    child?: T1
  }>({})

  expect(events).toStrictEqual([])

  onDeepChange(root, (change) => {
    events.push({ change })
  })

  runInAction(() => {
    root.child = t1({
      value: 1,
    })
  })

  expect(events).toMatchInlineSnapshot(`
[
  "init",
  {
    "change": {
      "debugObjectName": "ObservableObject@7",
      "name": "child",
      "newValue": {
        "$$type": "1",
        "value": 2,
      },
      "object": {
        "child": {
          "$$type": "1",
          "value": 2,
        },
      },
      "observableKind": "object",
      "type": "add",
    },
  },
]
`)
  expect(root.child!.value).toBe(2)
})

it("should use onNodeInit for migrations", () => {
  type OldTodo = TNode<
    "todo",
    {
      text: string
    }
  >

  interface Todo extends OldTodo {
    done: boolean
  }

  using tTodo = nodeType<Todo>("todo").onInit((todo: OldTodo | Todo) => {
    if (!("done" in todo)) {
      ;(todo as Todo).done = false
    }
  })

  const todo = tTodo({ text: "Buy milk" } as any)

  expect(todo.done).toBe(false)
})
