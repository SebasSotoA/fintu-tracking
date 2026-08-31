"use client"

import type { ReactElement } from "react"
import { Search, Settings, User } from "lucide-react"
import { navActive, navIdle } from "@/components/layout/app-sidebar-constants"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import type { SettingsCategoryDef, SettingsCategoryId } from "./settings-catalog"

const CATEGORY_ICONS = {
  settings: Settings,
  user: User,
} as const

interface SettingsNavProps {
  categories: Pick<SettingsCategoryDef, "id" | "label" | "icon">[]
  activeId: SettingsCategoryId
  onCategoryChange: (id: SettingsCategoryId) => void
  query: string
  onQueryChange: (query: string) => void
}

export function SettingsNav({
  categories,
  activeId,
  onCategoryChange,
  query,
  onQueryChange,
}: SettingsNavProps): ReactElement {
  const isMobile = useIsMobile()

  return (
    <div className={cn("flex flex-col gap-3", isMobile && "px-4 pt-2")}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search settings"
          aria-label="Search settings"
          className="h-9 rounded-lg border-transparent bg-muted/70 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50"
        />
      </div>
      <nav aria-label="Settings categories">
        {isMobile ? (
          <div
            data-testid="settings-nav-chips"
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-minimal"
          >
            {categories.map((category) => (
              <SettingsNavItem
                key={category.id}
                category={category}
                active={category.id === activeId}
                onSelect={onCategoryChange}
                variant="chip"
              />
            ))}
          </div>
        ) : (
          <div data-testid="settings-nav-rail" className="flex flex-col gap-1">
            {categories.map((category) => (
              <SettingsNavItem
                key={category.id}
                category={category}
                active={category.id === activeId}
                onSelect={onCategoryChange}
                variant="rail"
              />
            ))}
          </div>
        )}
      </nav>
    </div>
  )
}

interface SettingsNavItemProps {
  category: Pick<SettingsCategoryDef, "id" | "label" | "icon">
  active: boolean
  onSelect: (id: SettingsCategoryId) => void
  variant: "rail" | "chip"
}

function SettingsNavItem({
  category,
  active,
  onSelect,
  variant,
}: SettingsNavItemProps): ReactElement {
  const Icon = CATEGORY_ICONS[category.icon]

  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(category.id)}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-3 text-sm font-medium",
        "outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        "motion-reduce:transition-none",
        variant === "rail" ? "h-9 w-full" : "min-h-11 shrink-0",
        active ? navActive : navIdle,
      )}
    >
      {active ? (
        <span
          data-testid="settings-nav-pip"
          className="absolute left-1.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
        />
      ) : null}
      <Icon className="size-4 shrink-0" aria-hidden />
      {category.label}
    </button>
  )
}
