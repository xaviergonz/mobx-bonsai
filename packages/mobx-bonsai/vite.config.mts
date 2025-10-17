import path from "path"
import typescript2 from "rollup-plugin-typescript2"
import { defineConfig } from "vite"

const resolvePath = (str: string) => path.resolve(__dirname, str)

export default defineConfig({
  build: {
    target: "node10",
    lib: {
      entry: resolvePath("./src/index.ts"),
      name: "mobx-bonsai",
    },
    sourcemap: "inline",
    minify: false,

    rollupOptions: {
      external: ["mobx"],

      output: [
        {
          format: "esm",
          entryFileNames: "mobx-bonsai.esm.mjs",
        },
        {
          name: "mobx-bonsai",
          format: "umd",
          globals: {
            mobx: "mobx",
          },
        },
      ],
    },
  },
  plugins: [
    {
      ...typescript2({
        useTsconfigDeclarationDir: true,
      }),
      enforce: "pre",
    },
  ],
})
