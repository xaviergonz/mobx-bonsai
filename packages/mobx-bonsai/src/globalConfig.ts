import { defaultNodeKeyGenerator, NodeKeyGenerator } from "./node/utils/nodeKeyGenerator"

/**
 * Global config object.
 */
export interface GlobalConfig {
  /**
   * Node key generator function.
   */
  keyGenerator: NodeKeyGenerator
}

// defaults
let globalConfig: GlobalConfig = {
  keyGenerator: defaultNodeKeyGenerator,
}

/**
 * Partially sets the current global config.
 *
 * @param config Partial object with the new configurations. Options not included in the object won't be changed.
 */
export function setGlobalConfig(config: Partial<GlobalConfig>) {
  globalConfig = Object.freeze({
    ...globalConfig,
    ...config,
  })
}

/**
 * Returns the current global config object.
 *
 * @returns
 */
export function getGlobalConfig(): Readonly<GlobalConfig> {
  return globalConfig
}
