import type { EnglishCatalog } from "./en"

export type Locale = "en" | "es"

export const LOCALES: readonly Locale[] = ["en", "es"]
export const DEFAULT_LOCALE: Locale = "en"

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "es"
}

type NestedKeyOf<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${NestedKeyOf<T[K]>}`
      : never
}[keyof T & string]

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
}

export type MessageCatalog = DeepStringify<EnglishCatalog>
export type MessageKey = NestedKeyOf<EnglishCatalog>
export type InterpolationVars = Record<string, string | number>
