import type { MessageCatalog } from "./types"

export const es = {
  nav: {
    dashboard: "Panel",
  },
  settings: {
    language: "Idioma",
  },
  hello: "Hola, {name}",
} as const satisfies MessageCatalog
