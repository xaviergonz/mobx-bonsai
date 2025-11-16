import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const mobxVersion = Number(process.env.MOBX_VERSION || "6") as 4 | 5 | 6
console.log(`Using mobxVersion=${mobxVersion}`)

const tsconfigFiles = {
  6: "tsconfig.json",
  5: "tsconfig.mobx5.json",
  4: "tsconfig.mobx4.json",
} as const

const mobxModuleNames = {
  6: "mobx",
  5: "mobx-v5",
  4: "mobx-v4",
} as const

const tsconfigFile = tsconfigFiles[mobxVersion]
const mobxModuleName = mobxModuleNames[mobxVersion]

const dirname = path.dirname(fileURLToPath(import.meta.url))

type TsConfig = {
  extends?: string
  compilerOptions?: Record<string, unknown>
  [key: string]: unknown
}

function loadTsconfig(tsconfigPath: string): TsConfig {
  const {
    extends: baseExtends,
    compilerOptions = {},
    ...rest
  } = JSON.parse(readFileSync(tsconfigPath, "utf8")) as TsConfig

  if (!baseExtends) {
    return {
      compilerOptions,
      ...rest,
    }
  }

  const basePath = path.resolve(path.dirname(tsconfigPath), baseExtends)
  const baseConfig = loadTsconfig(basePath)

  return {
    ...baseConfig,
    ...rest,
    compilerOptions: {
      ...baseConfig.compilerOptions,
      ...compilerOptions,
    },
  }
}

const tsconfigRaw = loadTsconfig(path.resolve(dirname, "test", tsconfigFile))

tsconfigRaw.compilerOptions ??= {}

export default defineConfig({
  esbuild: {
    target: "es2020",
    tsconfigRaw,
  },
  test: {
    environment: "node",
    setupFiles: ["./test/commonSetup.ts"],
    globals: true,
    alias: {
      mobx: mobxModuleName,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
})
