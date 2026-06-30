"use client"

import * as React from "react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Filter } from "lucide-react"

interface MobileFilterDrawerProps {
  activeCount: number
  title?: string
  description?: string
  triggerLabel?: string
  triggerAriaLabel?: string
  closeLabel?: string
  children: React.ReactNode
  testId?: string
}

export function MobileFilterDrawer({
  activeCount,
  title = "Filters",
  description = "Adjust the filters to narrow your results",
  triggerLabel = "Filters",
  triggerAriaLabel = `Open ${triggerLabel.toLowerCase()}`,
  closeLabel = "Close",
  children,
  testId = "mobile-filter-drawer",
}: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden" data-testid={testId}>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="default"
            aria-label={triggerAriaLabel}
            className="w-full gap-2 md:hidden"
          >
            <Filter className="size-4" />
            {triggerLabel}
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeCount}
              </Badge>
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="px-4 pb-safe">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 py-2">{children}</div>
          <DrawerFooter className="px-4 pb-6">
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full">
                {closeLabel}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
