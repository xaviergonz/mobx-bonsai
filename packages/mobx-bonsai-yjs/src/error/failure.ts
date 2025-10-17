import { MobxBonsaiYjsError } from "./MobxBonsaiYjsError"

export function failure(msg: string) {
  return new MobxBonsaiYjsError(msg)
}
