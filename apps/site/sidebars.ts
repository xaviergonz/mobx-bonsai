import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    "comparison",
    "nodes",
    "snapshots",
    "treeLikeStructure",
    {
      type: "category",
      label: "Integrations",
      items: ["integrations/yjsBinding"],
    },
    {
      type: "category",
      label: "Examples",
      items: ["examples/todoList/todoList", "examples/yjsBinding/yjsBinding"],
    },
  ],
}

export default sidebars
