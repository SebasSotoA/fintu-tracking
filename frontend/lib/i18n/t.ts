import type { InterpolationVars, MessageCatalog, MessageKey } from "./types"

export function t(
  catalog: MessageCatalog,
  key: MessageKey,
  vars?: InterpolationVars,
): string {
  const template = lookup(catalog, key)
  if (!vars) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = vars[name]
    return value === undefined ? placeholder : String(value)
  })
}

function lookup(catalog: MessageCatalog, key: MessageKey): string {
  let current: unknown = catalog
  for (const part of key.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return key
    }
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" ? current : key
}
