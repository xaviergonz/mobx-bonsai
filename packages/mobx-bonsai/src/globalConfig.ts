import { defaultNodeKeyGenerator, NodeKeyGenerator } from "./node/utils/nodeKeyGenerator"

/**
 * Global config object.
 */
export interface GlobalConfig {
  /**
   * Node key generator function.
   */
  keyGenerator: NodeKeyGenerator

  /**
   * Whether to check for circular references when attaching nodes.
   * When enabled, throws an error if a node would become an ancestor of itself.
   * When disabled, circular references may cause infinite loops.
   * For performance reasons this setting is disabled by default.
   * Default: false
   */
  checkCircularReferences: boolean
}

// defaults
let globalConfig: GlobalConfig = {
  keyGenerator: defaultNodeKeyGenerator,
  checkCircularReferences: false,
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
