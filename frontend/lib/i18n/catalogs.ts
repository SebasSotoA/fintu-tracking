import { en } from "./en"
import { es } from "./es"
import type { Locale, MessageCatalog } from "./types"

export const catalogs: Record<Locale, MessageCatalog> = { en, es }
