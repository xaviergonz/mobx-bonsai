import type { Config } from "jest"

const mobxVersion = Number(process.env.MOBX_VERSION || "6") as 4 | 5 | 6
console.log(`Using mobxVersion=${mobxVersion}`)

const tsconfigFiles = {
  6: "tsconfig.json",
  5: "tsconfig.mobx5.json",
  4: "tsconfig.mobx4.json",
}

const mobxModuleNames = {
  6: "mobx",
  5: "mobx-v5",
  4: "mobx-v4",
}

const tsconfigFile = tsconfigFiles[mobxVersion]
const mobxModuleName = mobxModuleNames[mobxVersion]

const config: Config = {
  setupFilesAfterEnv: ["./test/commonSetup.ts"],
  moduleNameMapper: {
    // Map all mobx imports (including from mobx-bonsai source) to the same instance
    "^mobx$": `<rootDir>/../../node_modules/${mobxModuleName}`,
    // Use source files from mobx-bonsai instead of built version
    // This ensures mobx-bonsai also uses the correct mobx version
    "^mobx-bonsai$": "<rootDir>/../mobx-bonsai/src/index.ts",
  },
  prettierPath: null,
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: `./test/${tsconfigFile}` }],
  },
}

export default config
