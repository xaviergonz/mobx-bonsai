import { configure } from "mobx"
import { beforeEach } from "vitest"
import { setGlobalConfig } from "../src/globalConfig"

configure({ enforceActions: "always" })

let id = 1

setGlobalConfig({
  keyGenerator() {
    return `id-${id++}`
  },
})

beforeEach(() => {
  id = 1
})
