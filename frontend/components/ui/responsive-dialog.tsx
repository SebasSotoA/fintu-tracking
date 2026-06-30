"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

interface ResponsiveDialogContextValue {
  isMobile: boolean
}

const ResponsiveDialogContext = React.createContext<ResponsiveDialogContextValue | null>(null)

function useResponsiveDialogContext() {
  const ctx = React.useContext(ResponsiveDialogContext)
  if (!ctx) {
    throw new Error("ResponsiveDialog subcomponents must be used inside ResponsiveDialog")
  }
  return ctx
}

interface ResponsiveDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function ResponsiveDialog({ children, open, onOpenChange }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  // Prevent hydration / test mismatch: default to desktop until mounted.
  if (isMobile === undefined) {
    return null
  }

  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      )}
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const { isMobile } = useResponsiveDialogContext()
  return isMobile ? <DrawerTrigger {...props} /> : <DialogTrigger {...props} />
}

function ResponsiveDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const { isMobile } = useResponsiveDialogContext()
  return isMobile ? (
    <DrawerContent className={className} {...props} />
  ) : (
    <DialogContent className={className} {...props} />
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialogContext()
  return isMobile ? (
    <DrawerHeader className={className} {...props} />
  ) : (
    <DialogHeader className={className} {...props} />
  )
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialogContext()
  return isMobile ? (
    <DrawerFooter className={className} {...props} />
  ) : (
    <DialogFooter className={className} {...props} />
  )
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const { isMobile } = useResponsiveDialogContext()
  return isMobile ? (
    <DrawerTitle className={className} {...props} />
  ) : (
    <DialogTitle className={className} {...props} />
  )
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isMobile } = useResponsiveDialogContext()
  return isMobile ? (
    <DrawerDescription className={className} {...props} />
  ) : (
    <DialogDescription className={className} {...props} />
  )
}

function ResponsiveDialogClose({
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const { isMobile } = useResponsiveDialogContext()
  return isMobile ? <DrawerClose {...props} /> : <DialogClose {...props} />
}

function ResponsiveDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogOverlay>) {
  const { isMobile } = useResponsiveDialogContext()
  return isMobile ? (
    <DrawerOverlay className={className} {...props} />
  ) : (
    <DialogOverlay className={className} {...props} />
  )
}

function ResponsiveDialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPortal>) {
  const { isMobile } = useResponsiveDialogContext()
  return isMobile ? <DrawerPortal {...props} /> : <DialogPortal {...props} />
}

const _ResponsiveDialog = Object.assign(ResponsiveDialog, {
  Trigger: ResponsiveDialogTrigger,
  Content: ResponsiveDialogContent,
  Header: ResponsiveDialogHeader,
  Footer: ResponsiveDialogFooter,
  Title: ResponsiveDialogTitle,
  Description: ResponsiveDialogDescription,
  Close: ResponsiveDialogClose,
  Overlay: ResponsiveDialogOverlay,
  Portal: ResponsiveDialogPortal,
})

export {
  _ResponsiveDialog as ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose,
  ResponsiveDialogOverlay,
  ResponsiveDialogPortal,
}
