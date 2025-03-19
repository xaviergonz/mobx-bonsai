import { assertIsNode } from "../node/node"
import { applySnapshot } from "../node/snapshot/applySnapshot"
import { getSnapshot } from "../node/snapshot/getSnapshot"
import { onSnapshot } from "../node/snapshot/onSnapshot"

/**
 * Connects a node to a redux dev tools instance.
 *
 * @param remotedevPackage The remotedev package (usually the result of `require("remoteDev")`) (https://www.npmjs.com/package/remotedev).
 * @param remotedevConnection The result of a connect method from the remotedev package (usually the result of `remoteDev.connectViaExtension(...)`).
 * @param target Node to use as root.
 * @param storeName Name to be shown in the redux dev tools.
 */
export function connectReduxDevTools(
  remotedevPackage: any,
  remotedevConnection: any,
  target: object
) {
  assertIsNode(target, "target")

  let handlingMonitorAction = 0

  // subscribe to change state (if need more than just logging)
  remotedevConnection.subscribe((message: any) => {
    if (message.type === "DISPATCH") {
      handleMonitorActions(remotedevConnection, target, message)
    }
  })

  const initialState = getSnapshot(target)
  remotedevConnection.init(initialState)

  let lastLoggedSnapshot = initialState

  onSnapshot(target, (sn) => {
    if (handlingMonitorAction) {
      return
    }

    // ignore actions that don't change anything
    if (sn === lastLoggedSnapshot) {
      return
    }
    lastLoggedSnapshot = sn

    const copy = {
      type: "onSnapshot",
    }

    remotedevConnection.send(copy, sn)
  })

  function handleMonitorActions(remotedev2: any, target2: any, message: any) {
    try {
      handlingMonitorAction++

      switch (message.payload.type) {
        case "RESET": {
          applySnapshot(target2, initialState)
          return remotedev2.init(initialState)
        }

        case "COMMIT":
          return remotedev2.init(getSnapshot(target2))

        case "ROLLBACK": {
          const state = remotedevPackage.extractState(message)
          applySnapshot(target2, state)
          return remotedev2.init(state)
        }

        case "JUMP_TO_STATE":
        case "JUMP_TO_ACTION": {
          applySnapshot(target2, remotedevPackage.extractState(message))
          return
        }

        case "IMPORT_STATE": {
          const nextLiftedState = message.payload.nextLiftedState
          const computedStates = nextLiftedState.computedStates
          applySnapshot(target2, computedStates[computedStates.length - 1].state)
          remotedev2.send(null, nextLiftedState)
          return
        }

        default:
      }
    } finally {
      handlingMonitorAction--
    }
  }
}
