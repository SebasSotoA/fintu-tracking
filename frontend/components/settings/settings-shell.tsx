"use client"

import type { ReactElement, ReactNode } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { SettingsNav } from "./settings-nav"
import type { SettingsCategoryDef, SettingsCategoryId } from "./settings-catalog"

interface SettingsShellProps {
  header: ReactNode
  categories: Pick<SettingsCategoryDef, "id" | "label" | "icon">[]
  activeId: SettingsCategoryId
  onCategoryChange: (id: SettingsCategoryId) => void
  query: string
  onQueryChange: (query: string) => void
  children: ReactNode
  footer?: ReactNode
}

export function SettingsShell({
  header,
  categories,
  activeId,
  onCategoryChange,
  query,
  onQueryChange,
  children,
  footer,
}: SettingsShellProps): ReactElement {
  const isMobile = useIsMobile()

  const nav = (
    <SettingsNav
      categories={categories}
      activeId={activeId}
      onCategoryChange={onCategoryChange}
      query={query}
      onQueryChange={onQueryChange}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex h-14 shrink-0 items-center border-b border-border px-6 pr-14">
        {header}
      </div>
      {isMobile ? (
        <>
          {nav}
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              data-testid="settings-content"
              className="min-h-0 flex-1 overflow-y-auto px-6 py-6 scrollbar-minimal"
            >
              {children}
            </div>
            {footer}
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div
            data-testid="settings-rail"
            className="flex w-56 shrink-0 flex-col gap-3 border-r border-border/60 bg-background/40 px-3 py-4"
          >
            {nav}
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              data-testid="settings-content"
              className="min-h-0 flex-1 overflow-y-auto px-6 py-6 scrollbar-minimal"
            >
              {children}
            </div>
            {footer}
          </div>
        </div>
      )}
    </div>
  )
}
