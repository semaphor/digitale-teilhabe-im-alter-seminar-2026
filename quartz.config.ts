import { QuartzConfig } from "quartz/config"

export const cfg: QuartzConfig = {
  configuration: {
    pageTitle: "Digitale Teilhabe im Alter – Seminar 2026",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    baseUrl: "/digitale-teilhabe-im-alter-seminar-2026/",
    ignorePatterns: ["vortraege/_site", "vortraege/node_modules", "vortraege/package*.json", ".git"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      font: "Inter",
      primary: "#1a5fb4",
      secondary: "#222",
      accent: "#666",
      darkModePrimary: "#1a5fb4",
      darkModeSecondary: "#eee",
      darkModeAccent: "#999",
    },
  },
  plugins: {
    syntaxHighlighting: {
      enable: true,
      theme: {
        light: "github-light",
        dark: "github-dark",
      },
    },
    backlinks: {
      enable: true,
      heading: "Backlinks",
    },
    tagPage: {
      enable: true,
      heading: "Tags",
    },
    graph: {
      enable: true,
      heading: "Graph View",
    },
    recentNotes: {
      enable: true,
      heading: "Letzte Änderungen",
      limit: 5,
    },
    search: {
      enable: true,
      heading: "Suche",
    },
    localSearch: {
      enable: true,
      heading: "Lokale Suche",
      indexAll: true,
    },
    folderPage: {
      enable: true,
      heading: "Ordner",
    },
  },
}

export default cfg
