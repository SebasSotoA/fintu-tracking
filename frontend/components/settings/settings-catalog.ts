export type SettingsCategoryId = "general" | "account"

export interface SettingsRowDef {
  id: "theme" | "country" | "broker"
  label: string
  keywords: string[]
}

export interface SettingsSectionDef {
  id: string
  heading: string
  rows: SettingsRowDef[]
}

export interface SettingsCategoryDef {
  id: SettingsCategoryId
  label: string
  icon: "settings" | "user"
  sections: SettingsSectionDef[]
}

export const SETTINGS_CATALOG: SettingsCategoryDef[] = [
  {
    id: "general",
    label: "General",
    icon: "settings",
    sections: [
      {
        id: "appearance",
        heading: "APPEARANCE",
        rows: [
          {
            id: "theme",
            label: "Theme",
            keywords: ["theme", "dark", "light", "system", "appearance"],
          },
        ],
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    icon: "user",
    sections: [
      {
        id: "profile",
        heading: "PROFILE",
        rows: [
          {
            id: "country",
            label: "Country",
            keywords: ["country", "profile"],
          },
          {
            id: "broker",
            label: "Broker",
            keywords: ["broker", "profile"],
          },
        ],
      },
    ],
  },
]

function includesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query)
}

function rowMatches(row: SettingsRowDef, query: string): boolean {
  return includesQuery(row.label, query) || row.keywords.some((keyword) => includesQuery(keyword, query))
}

export function filterSettingsCatalog(
  catalog: SettingsCategoryDef[],
  query: string,
): SettingsCategoryDef[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return catalog
  }

  const filtered: SettingsCategoryDef[] = []

  for (const category of catalog) {
    const categoryLabelMatches = includesQuery(category.label, normalized)

    if (categoryLabelMatches) {
      filtered.push(category)
      continue
    }

    const sections: SettingsSectionDef[] = []

    for (const section of category.sections) {
      const headingMatches = includesQuery(section.heading, normalized)
      if (headingMatches) {
        sections.push(section)
        continue
      }

      const rows = section.rows.filter((row) => rowMatches(row, normalized))
      if (rows.length > 0) {
        sections.push({ ...section, rows })
      }
    }

    if (sections.length > 0) {
      filtered.push({ ...category, sections })
    }
  }

  return filtered
}
