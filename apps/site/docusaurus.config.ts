import type * as Preset from "@docusaurus/preset-classic"
import type { Config } from "@docusaurus/types"

const docsRouteBasePath = "/"

const config: Config = {
  title: "mobx-bonsai",
  tagline:
    "A MobX powered state management solution based on data trees with first-class support for TypeScript, snapshots, patches and much more",
  url: "https://mobx-bonsai.js.org",
  baseUrl: "/",
  onBrokenLinks: "ignore", // because of /api/ links
  favicon: "img/favicon.ico",
  organizationName: "xaviergonz",
  projectName: "mobx-bonsai",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/xaviergonz/mobx-bonsai/edit/master/apps/site/",
          routeBasePath: docsRouteBasePath,
        },
        blog: false,
        sitemap: {},
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        indexDocs: true,
        docsRouteBasePath,
        indexBlog: false,
        indexPages: false,
      },
    ],
  ],

  themeConfig: {
    navbar: {
      style: "dark",
      title: "mobx-bonsai",
      logo: {
        alt: "mobx-bonsai",
        src: "img/logo.png",
      },
      items: [
        {
          type: "doc",
          docId: "intro",
          position: "right",
          label: "Documentation",
        },
        {
          href: "/api/",
          target: "_blank",
          label: "API",
          position: "right",
        },
        {
          href: "https://github.com/xaviergonz/mobx-bonsai",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      copyright: `Copyright © ${new Date().getFullYear()} Javier González Garcés`,
    },
    docs: {
      sidebar: {
        hideable: true,
      },
    },
  } satisfies Preset.ThemeConfig,
}

module.exports = config
