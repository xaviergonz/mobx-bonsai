import path from "path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

const resolvePath = (str: string) => path.resolve(__dirname, str)

export default defineConfig({
  build: {
    target: "node10",
    lib: {
      entry: resolvePath("./src/index.ts"),
      name: "mobx-bonsai-yjs",
    },
    sourcemap: "inline",
    minify: false,

    rollupOptions: {
      external: ["mobx", "mobx-bonsai", "yjs"],

      output: [
        {
          format: "esm",
          entryFileNames: "mobx-bonsai-yjs.esm.mjs",
        },
        {
          name: "mobx-bonsai-yjs",
          format: "umd",
          globals: {
            mobx: "mobx",
            "mobx-bonsai": "mobx-bonsai",
            yjs: "yjs",
          },
        },
      ],
    },
  },
  plugins: [
    dts({
      tsconfigPath: resolvePath("./tsconfig.json"),
      outDir: resolvePath("./dist/types"),
    }),
  ],
})
