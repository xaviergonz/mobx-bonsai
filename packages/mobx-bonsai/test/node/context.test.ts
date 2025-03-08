import { observable, reaction, runInAction } from "mobx"
import { _, assert } from "spec.ts"
import { createContext, node, nodeType, TNode } from "../../src"
import { autoDispose } from "../utils"

const createP = () =>
  node({
    x: 5,
    p2: {
      y: 12,
    } as { y: number } | undefined,
    arr: [],
  })

test("context with set default value", () => {
  const ctx = createContext(1)
  expect(ctx.getDefault()).toBe(1)
  ctx.setDefault(2)
  expect(ctx.getDefault()).toBe(2)
})

test("context with non set default value", () => {
  const ctx = createContext<number>()

  let reactionCalls = 0
  autoDispose(
    reaction(
      () => ctx.getDefault(),
      () => {
        reactionCalls++
      }
    )
  )

  expect(ctx.getDefault()).toBe(undefined)

  ctx.setDefault(2)
  expect(reactionCalls).toBe(1)
  expect(ctx.getDefault()).toBe(2)

  ctx.setDefault(undefined)
  expect(reactionCalls).toBe(2)
  expect(ctx.getDefault()).toBe(undefined)

  // using computed default
  const obs = observable.box(5)
  ctx.setDefaultComputed(() => obs.get())
  expect(reactionCalls).toBe(3)
  expect(ctx.getDefault()).toBe(5)

  runInAction(() => {
    obs.set(6)
  })
  expect(reactionCalls).toBe(4)
  expect(ctx.getDefault()).toBe(6)

  // back to static
  ctx.setDefault(20)
  expect(reactionCalls).toBe(5)
  expect(ctx.getDefault()).toBe(20)
})

test("context with static values", () => {
  const ctx = createContext(1)

  const p = createP()

  let pCalls = 0
  let p2Calls = 0
  let arrCalls = 0
  autoDispose(
    reaction(
      () => ctx.get(p),
      () => {
        pCalls++
      }
    )
  )
  autoDispose(
    reaction(
      () => ctx.get(p.p2!),
      () => {
        p2Calls++
      }
    )
  )
  autoDispose(
    reaction(
      () => ctx.get(p.arr),
      () => {
        arrCalls++
      }
    )
  )

  const expectReactionCalls = (p: number, p2: number, arr: number) => {
    expect(pCalls).toBe(p)
    expect(p2Calls).toBe(p2)
    expect(arrCalls).toBe(arr)
    pCalls = 0
    p2Calls = 0
    arrCalls = 0
  }

  // should use the default for now
  expectReactionCalls(0, 0, 0)
  expect(ctx.get(p)).toBe(1)
  expect(ctx.get(p.p2!)).toBe(1)
  expect(ctx.get(p.arr)).toBe(1)
  expect(ctx.getProviderNode(p)).toBe(undefined)
  expect(ctx.getProviderNode(p.p2!)).toBe(undefined)
  expect(ctx.getProviderNode(p.arr)).toBe(undefined)

  ctx.set(p, 2)
  expectReactionCalls(1, 1, 1)
  expect(ctx.get(p)).toBe(2)
  expect(ctx.get(p.p2!)).toBe(2)
  expect(ctx.get(p.arr)).toBe(2)
  expect(ctx.getProviderNode(p)).toBe(p)
  expect(ctx.getProviderNode(p.p2!)).toBe(p)
  expect(ctx.getProviderNode(p.arr)).toBe(p)

  // set same value again
  ctx.set(p, 2)
  expectReactionCalls(0, 0, 0)
  expect(ctx.get(p)).toBe(2)
  expect(ctx.get(p.p2!)).toBe(2)
  expect(ctx.get(p.arr)).toBe(2)
  expect(ctx.getProviderNode(p)).toBe(p)
  expect(ctx.getProviderNode(p.p2!)).toBe(p)
  expect(ctx.getProviderNode(p.arr)).toBe(p)

  ctx.set(p.p2!, 3)
  expectReactionCalls(0, 1, 0)
  expect(ctx.get(p)).toBe(2)
  expect(ctx.get(p.p2!)).toBe(3)
  expect(ctx.get(p.arr)).toBe(2)
  expect(ctx.getProviderNode(p)).toBe(p)
  expect(ctx.getProviderNode(p.p2!)).toBe(p.p2)
  expect(ctx.getProviderNode(p.arr)).toBe(p)

  ctx.unset(p)
  expectReactionCalls(1, 0, 1)
  expect(ctx.get(p)).toBe(1)
  expect(ctx.get(p.p2!)).toBe(3)
  expect(ctx.get(p.arr)).toBe(1)
  expect(ctx.getProviderNode(p)).toBe(undefined)
  expect(ctx.getProviderNode(p.p2!)).toBe(p.p2)
  expect(ctx.getProviderNode(p.arr)).toBe(undefined)

  ctx.setDefault(5)
  expectReactionCalls(1, 0, 1)
  expect(ctx.get(p)).toBe(5)
  expect(ctx.get(p.p2!)).toBe(3)
  expect(ctx.get(p.arr)).toBe(5)
  expect(ctx.getProviderNode(p)).toBe(undefined)
  expect(ctx.getProviderNode(p.p2!)).toBe(p.p2)
  expect(ctx.getProviderNode(p.arr)).toBe(undefined)
})

test("context with computed values", () => {
  const ctx = createContext(1)

  const p = createP()

  let pCalls = 0
  let p2Calls = 0
  let arrCalls = 0
  autoDispose(
    reaction(
      () => ctx.get(p),
      () => {
        pCalls++
      }
    )
  )
  autoDispose(
    reaction(
      () => ctx.get(p.p2!),
      () => {
        p2Calls++
      }
    )
  )
  autoDispose(
    reaction(
      () => ctx.get(p.arr),
      () => {
        arrCalls++
      }
    )
  )

  const expectReactionCalls = (p: number, p2: number, arr: number) => {
    expect(pCalls).toBe(p)
    expect(p2Calls).toBe(p2)
    expect(arrCalls).toBe(arr)
    pCalls = 0
    p2Calls = 0
    arrCalls = 0
  }

  // should use the default for now
  expect(ctx.get(p)).toBe(1)
  expectReactionCalls(0, 0, 0)
  expect(ctx.get(p.p2!)).toBe(1)
  expect(ctx.get(p.arr)).toBe(1)

  ctx.setComputed(p, () => p.x) // p.x defaults to 5
  expectReactionCalls(1, 1, 1)
  expect(ctx.get(p)).toBe(p.x)
  expect(ctx.get(p.p2!)).toBe(p.x)
  expect(ctx.get(p.arr)).toBe(p.x)

  runInAction(() => {
    p.x = 10
  })
  expectReactionCalls(1, 1, 1)
  expect(ctx.get(p)).toBe(p.x)
  expect(ctx.get(p.p2!)).toBe(p.x)
  expect(ctx.get(p.arr)).toBe(p.x)

  ctx.set(p.p2!, 3)
  expectReactionCalls(0, 1, 0)
  expect(ctx.get(p)).toBe(p.x)
  expect(ctx.get(p.p2!)).toBe(3)
  expect(ctx.get(p.arr)).toBe(p.x)

  // switch to static value
  ctx.set(p, 20)
  expectReactionCalls(1, 0, 1)
  expect(ctx.get(p)).toBe(20)
  expect(ctx.get(p.p2!)).toBe(3)
  expect(ctx.get(p.arr)).toBe(20)

  // back to computed
  ctx.setComputed(p, () => p.x)
  expectReactionCalls(1, 0, 1)
  expect(ctx.get(p)).toBe(p.x)
  expect(ctx.get(p.p2!)).toBe(3)
  expect(ctx.get(p.arr)).toBe(p.x)

  ctx.unset(p)
  expectReactionCalls(1, 0, 1)
  expect(ctx.get(p)).toBe(1)
  expect(ctx.get(p.p2!)).toBe(3)
  expect(ctx.get(p.arr)).toBe(1)

  ctx.setDefault(5)
  expectReactionCalls(1, 0, 1)
  expect(ctx.get(p)).toBe(5)
  expect(ctx.get(p.p2!)).toBe(3)
  expect(ctx.get(p.arr)).toBe(5)
})

test("context typings", () => {
  const ctx1 = createContext<number>()
  assert(_ as ReturnType<typeof ctx1.getDefault>, _ as number | undefined)
  assert(_ as ReturnType<typeof ctx1.get>, _ as number | undefined)
  assert(_ as typeof ctx1.setDefault, _ as (v: number | undefined) => void)
  assert(_ as typeof ctx1.set, _ as (n: object, v: number | undefined) => void)
  assert(_ as typeof ctx1.setComputed, _ as (n: object, v: () => number | undefined) => void)

  const ctx2 = createContext(5)
  assert(_ as ReturnType<typeof ctx2.getDefault>, _ as number)
  assert(_ as ReturnType<typeof ctx2.get>, _ as number)
  assert(_ as typeof ctx2.setDefault, _ as (v: number) => void)
  assert(_ as typeof ctx2.set, _ as (n: object, v: number) => void)
  assert(_ as typeof ctx2.setComputed, _ as (n: object, v: () => number) => void)

  const ctx3 = createContext<number>(5)
  assert(_ as ReturnType<typeof ctx3.getDefault>, _ as number)
  assert(_ as ReturnType<typeof ctx3.get>, _ as number)
  assert(_ as typeof ctx3.setDefault, _ as (v: number) => void)
  assert(_ as typeof ctx3.set, _ as (n: object, v: number) => void)
  assert(_ as typeof ctx3.setComputed, _ as (n: object, v: () => number) => void)
})

test("context apply", () => {
  const ctx = createContext(1)

  const val = 2

  type M = TNode<
    "M",
    {
      children?: M[]
    }
  >

  using TM = nodeType<M>("M")
    .onInit((self) => {
      expect(ctx.getDefault()).toBe(1)
      expect(ctx.get(self)).toBe(val)
    })
    .getters({
      method() {
        expect(ctx.getDefault()).toBe(1)
        return ctx.get(this)
      },
    })

  const m = ctx.apply(() => TM({ children: [TM({})] }), val)
  expect(TM.method(m)).toBe(val)
  expect(TM.method(m.children![0])).toBe(val)
})

test("context applyComputed", () => {
  const ctx = createContext<number>()
  ctx.setDefaultComputed(() => 1)

  const val = 2

  type M = TNode<
    "M",
    {
      children?: M[]
    }
  >

  using TM = nodeType<M>("M")
    .onInit((self) => {
      expect(ctx.getDefault()).toBe(1)
      expect(ctx.get(self)).toBe(val)
    })
    .getters({
      method() {
        expect(ctx.getDefault()).toBe(1)
        return ctx.get(this)
      },
    })

  const m = ctx.applyComputed(
    () => TM({ children: [TM({})] }),
    () => val
  )
  expect(TM.method(m)).toBe(val)
  expect(TM.method(m.children![0])).toBe(val)
})

test("context is back to default when the parent providing the context is no longer there", () => {
  const ctx = createContext(1)

  const p = createP()
  ctx.set(p, 2)

  expect(ctx.get(p)).toBe(2)
  const p2 = p.p2!
  expect(ctx.get(p2)).toBe(2)

  runInAction(() => {
    p.p2 = undefined
  })

  // now that p is no longer providing the context, it should be back to the default
  expect(ctx.get(p2)).toBe(1)
})
