import { getSnapshot } from "mobx-bonsai"
import { observer } from "mobx-react-lite"
import React from "react"
import { TodoList } from "./store"

export const LogsView = observer((props: { rootStore: TodoList }) => {
  // we can convert any model (or part of it) into a plain JS structure
  // with it we can:
  // - serialize to later deserialize it
  // - pass it to non mobx-friendly components
  // snapshots respect immutability, so if a subobject is changed
  // its refrence will be kept
  const rootStoreSnapshot = getSnapshot(props.rootStore)

  return (
    <>
      <PreSection title="Generated immutable snapshot">
        {JSON.stringify(rootStoreSnapshot, null, 2)}
      </PreSection>
    </>
  )
})

function PreSection(props: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h5>{props.title}</h5>
      <pre style={{ fontSize: 10, whiteSpace: "pre-wrap" }}>{props.children}</pre>
    </>
  )
}
